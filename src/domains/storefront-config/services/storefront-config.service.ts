// src/modules/storefront-config/services/storefront-config.service.ts
import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  stores,
  storeDomains, // <-- add this import; rename if your table is named differently
  storefrontBases,
  storefrontThemes,
  storefrontOverrides,
} from 'src/infrastructure/drizzle/schema';
import { StorefrontConfigV1Schema } from '../schema';

/**
 * Merge rules:
 * - objects: deep merge
 * - arrays: override replaces base arrays
 * - scalars: override wins
 */
function deepMerge(a: any, b: any): any {
  if (Array.isArray(a) && Array.isArray(b)) return b;
  if (isObj(a) && isObj(b)) {
    const out: any = { ...a };
    for (const k of Object.keys(b)) out[k] = deepMerge(a?.[k], b[k]);
    return out;
  }
  return b === undefined ? a : b;
}

function isObj(x: any) {
  return x && typeof x === 'object' && !Array.isArray(x);
}

type OverrideCandidate = Partial<{
  baseId: string;
  themeId: string | null;
  ui: any;
  seo: any;
  header: any;
  footer: any;
  pages: any;
  theme: any;
}>;

@Injectable()
export class StorefrontConfigService {
  private readonly logger = new Logger(StorefrontConfigService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  private normalizeHost(host?: string | null): string {
    return (host ?? '')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .split(':')[0];
  }

  private isBlockedLocalhost(host: string): boolean {
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.localhost')
    );
  }

  /**
   * Resolve store by incoming host through the storeDomains table.
   *
   * Assumed schema:
   * - storeDomains.host
   * - storeDomains.storeId
   * - storeDomains.isActive
   *
   * If your column names differ, change only this method.
   */
  private async findStoreByHost(host: string) {
    const normalizedHost = this.normalizeHost(host);

    if (!normalizedHost) {
      throw new NotFoundException({
        code: 'DOMAIN_NOT_FOUND',
        message: 'Missing store host',
      });
    }

    if (this.isBlockedLocalhost(normalizedHost)) {
      throw new ForbiddenException({
        code: 'LOCALHOST_BLOCKED',
        message: 'Localhost is not allowed for storefront resolution',
      });
    }

    const domainRow = await this.db.query.storeDomains.findFirst({
      where: and(
        eq((storeDomains as any).host, normalizedHost),
        eq((storeDomains as any).isActive, true),
      ),
    });

    if (!domainRow) {
      throw new NotFoundException({
        code: 'DOMAIN_NOT_FOUND',
        message: `No store domain found for host ${normalizedHost}`,
      });
    }

    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, (domainRow as any).storeId),
    });

    if (!store) {
      throw new NotFoundException({
        code: 'DOMAIN_NOT_FOUND',
        message: `No store found for host ${normalizedHost}`,
      });
    }

    return { store, domainRow, normalizedHost };
  }

  /* ------------------------------------------------------------------ */
  /* Public runtime: resolved config by storeId (cached)                */
  /* ------------------------------------------------------------------ */
  async getResolvedByStoreId(
    storeId: string,
    options?: { overrideStatus?: 'published' | 'draft'; host?: string },
  ) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new NotFoundException({
        code: 'DOMAIN_NOT_FOUND',
        message: 'Store not found',
      });
    }

    const cacheKey = [
      'storefront',
      'config',
      'resolved',
      'store',
      storeId,
      'host',
      options?.host ?? 'none',
      'override-status',
      options?.overrideStatus ?? 'published',
    ];

    return this.cache.getOrSetCompanyAndGlobalVersioned(
      store.companyId,
      cacheKey,
      async () => {
        const resolved = await this.resolveForStore(
          storeId,
          undefined,
          options,
        );

        const parsed = StorefrontConfigV1Schema.safeParse(resolved);
        if (!parsed.success) {
          this.logger.warn(
            `Resolved storefront config failed zod validation for store=${storeId}: ${parsed.error.message}`,
          );
        }

        return resolved;
      },
      { ttlSeconds: 300 },
    );
  }

  /* ------------------------------------------------------------------ */
  /* Public runtime: resolved config by host/domain (cached)            */
  /* ------------------------------------------------------------------ */
  async getResolvedByHost(
    host: string,
    options?: { overrideStatus?: 'published' | 'draft' },
  ) {
    const { store, domainRow, normalizedHost } =
      await this.findStoreByHost(host);

    const cacheKey = [
      'storefront',
      'config',
      'resolved',
      'host',
      normalizedHost,
      'store',
      store.id,
      'override-status',
      options?.overrideStatus ?? 'published',
    ];

    return this.cache.getOrSetCompanyAndGlobalVersioned(
      store.companyId,
      cacheKey,
      async () => {
        const resolved = await this.resolveForStore(
          store.id,
          undefined,
          options,
        );

        const withDomainMeta = {
          ...resolved,
          store: {
            ...resolved.store,
            host: normalizedHost,
            domainId: (domainRow as any).id ?? undefined,
          },
        };

        const parsed = StorefrontConfigV1Schema.safeParse(withDomainMeta);
        if (!parsed.success) {
          this.logger.warn(
            `Resolved storefront config failed zod validation for host=${normalizedHost}, store=${store.id}: ${parsed.error.message}`,
          );
        }

        return withDomainMeta;
      },
      { ttlSeconds: 300 },
    );
  }

  /* ------------------------------------------------------------------ */
  /* Shared resolver: used by runtime + publish validation              */
  /* ------------------------------------------------------------------ */
  async resolveForStore(
    storeId: string,
    candidateOverride?: OverrideCandidate,
    options?: { overrideStatus?: 'published' | 'draft' },
  ) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) {
      throw new NotFoundException({
        code: 'DOMAIN_NOT_FOUND',
        message: 'Store not found',
      });
    }

    const overrideStatus = options?.overrideStatus ?? 'published';

    const publishedOverride = await this.db.query.storefrontOverrides.findFirst(
      {
        where: and(
          eq(storefrontOverrides.storeId, storeId),
          eq(storefrontOverrides.status, 'published' as any),
        ),
      },
    );

    const draftOverride =
      overrideStatus === 'published'
        ? undefined
        : await this.db
            .select()
            .from(storefrontOverrides)
            .where(
              and(
                eq(storefrontOverrides.storeId, storeId),
                eq(storefrontOverrides.status, 'draft' as any),
              ),
            )
            .limit(1)
            .then((rows) => rows[0]);

    const storedOverride =
      overrideStatus === 'published'
        ? publishedOverride
        : (draftOverride ?? publishedOverride);

    const effectiveOverride: OverrideCandidate | undefined =
      candidateOverride ?? (storedOverride as any) ?? undefined;

    const requireThemeMode = (
      process.env.STOREFRONT_REQUIRE_THEME_MODE ?? 'published'
    ).toLowerCase();

    const requireTheme =
      requireThemeMode === 'always'
        ? true
        : requireThemeMode === 'override'
          ? !!effectiveOverride
          : requireThemeMode === 'published'
            ? !!publishedOverride
            : false;

    const base = effectiveOverride?.baseId
      ? await this.db.query.storefrontBases.findFirst({
          where: and(
            eq(storefrontBases.id, effectiveOverride.baseId),
            eq(storefrontBases.isActive, true),
          ),
        })
      : await this.db.query.storefrontBases.findFirst({
          where: and(
            eq(storefrontBases.key, 'default-v1'),
            eq(storefrontBases.isActive, true),
          ),
        });

    if (!base) {
      throw new NotFoundException({
        code: 'CONFIG_NOT_PUBLISHED',
        message: 'Storefront base not found',
      });
    }

    if (requireTheme && !effectiveOverride?.themeId) {
      throw new ConflictException({
        code: 'THEME_NOT_READY',
        message: 'Theme is required but not set for this store',
      });
    }

    const themePreset = effectiveOverride?.themeId
      ? await this.db.query.storefrontThemes.findFirst({
          where: and(
            eq(storefrontThemes.id, effectiveOverride.themeId as any),
            eq(storefrontThemes.isActive, true),
            sql`(${storefrontThemes.companyId} IS NULL OR ${storefrontThemes.companyId} = ${store.companyId})`,
          ),
        })
      : null;

    if ((requireTheme || effectiveOverride?.themeId) && !themePreset) {
      throw new ConflictException({
        code: 'THEME_NOT_READY',
        message: 'Theme preset not found or not accessible for this store',
      });
    }

    let resolvedTheme = base.theme ?? {};
    if (themePreset?.theme)
      resolvedTheme = deepMerge(resolvedTheme, themePreset.theme);
    if (effectiveOverride?.theme)
      resolvedTheme = deepMerge(resolvedTheme, effectiveOverride.theme);

    let resolvedUi = base.ui ?? {};
    if (themePreset?.ui) resolvedUi = deepMerge(resolvedUi, themePreset.ui);
    if (effectiveOverride?.ui)
      resolvedUi = deepMerge(resolvedUi, effectiveOverride.ui);

    let resolvedSeo = base.seo ?? {};
    if (themePreset?.seo) resolvedSeo = deepMerge(resolvedSeo, themePreset.seo);
    if (effectiveOverride?.seo)
      resolvedSeo = deepMerge(resolvedSeo, effectiveOverride.seo);

    let resolvedHeader = base.header ?? {};
    if (themePreset?.header)
      resolvedHeader = deepMerge(resolvedHeader, themePreset.header);
    if (effectiveOverride?.header)
      resolvedHeader = deepMerge(resolvedHeader, effectiveOverride.header);

    let resolvedFooter = base.footer ?? {};
    if (themePreset?.footer)
      resolvedFooter = deepMerge(resolvedFooter, themePreset.footer);
    if (effectiveOverride?.footer)
      resolvedFooter = deepMerge(resolvedFooter, effectiveOverride.footer);

    let resolvedPages = base.pages ?? {};
    if (themePreset?.pages)
      resolvedPages = deepMerge(resolvedPages, themePreset.pages);
    if (effectiveOverride?.pages)
      resolvedPages = deepMerge(resolvedPages, effectiveOverride.pages);

    const resolved = {
      version: 1,
      store: {
        id: store.id,
        name: store.name,
        locale: (store as any).locale ?? undefined,
        currency: (store as any).currency ?? undefined,
      },
      theme: resolvedTheme,
      ui: resolvedUi,
      seo: resolvedSeo,
      header: resolvedHeader,
      footer: resolvedFooter,
      pages: resolvedPages,
    };

    return resolved;
  }
}
