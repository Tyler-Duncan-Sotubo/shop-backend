// src/modules/storefront-config/services/storefront-config.service.ts
import {
  Inject,
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import {
  stores,
  storefrontBases,
  storefrontThemes,
  storefrontOverrides,
} from 'src/drizzle/schema';
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

  /* ------------------------------------------------------------------ */
  /* Public runtime: resolved config (cached)                             */
  /* ------------------------------------------------------------------ */
  async getResolvedByStoreId(
    storeId: string,
    options?: { overrideStatus?: 'published' | 'draft' },
  ) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });

    if (!store) throw new NotFoundException('Store not found');

    const cacheKey = ['storefront', 'config', 'resolved', 'store', storeId];

    // ✅ Use combined company+global versioning so base changes invalidate caches
    return this.cache.getOrSetCompanyAndGlobalVersioned(
      store.companyId,
      cacheKey,
      async () => {
        const resolved = await this.resolveForStore(
          storeId,
          undefined,
          options,
        );

        // Optional runtime safety: don't break storefront if invalid, just log.
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
  /* Shared resolver: used by runtime + publish validation                */
  /* ------------------------------------------------------------------ */
  async resolveForStore(
    storeId: string,
    candidateOverride?: OverrideCandidate,
    options?: { overrideStatus?: 'published' | 'draft' },
  ) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
    if (!store) throw new NotFoundException('Store not found');

    const overrideStatus = options?.overrideStatus ?? 'published';

    // Always load published override (used by requireThemeMode === "published")
    const publishedOverride = await this.db.query.storefrontOverrides.findFirst(
      {
        where: and(
          eq(storefrontOverrides.storeId, storeId),
          eq(storefrontOverrides.status, 'published' as any),
        ),
      },
    );

    // Load stored override based on requested status (draft/published)
    // If overrideStatus is "published", this will be same as publishedOverride
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

    // Candidate override takes precedence (admin preview), otherwise use stored row
    const effectiveOverride: OverrideCandidate | undefined =
      candidateOverride ?? (storedOverride as any) ?? undefined;

    // ------------------------------------------------------------------
    // ✅ Require-theme flag (env-controlled)
    //
    // Modes:
    // - "never": never require a theme (current old behavior)
    // - "published": require theme only if there is a published override
    // - "override": require theme if ANY override candidate exists (published or preview)
    // - "always": always require theme for every store
    //
    // Default = "published" (safe for rollout)
    // ------------------------------------------------------------------
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
            : false; // "never"

    // 1) base
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

    if (!base) throw new NotFoundException('Storefront base not found');

    // ✅ If theme is required, and themeId is missing/undefined/null: DO NOT RESOLVE
    if (requireTheme && !effectiveOverride?.themeId) {
      throw new NotFoundException({
        code: 'THEME_NOT_SET',
        message: 'Theme is required but not set for this store',
      });
    }

    // 2) theme preset (full preset)
    // Requirement: "company and theme should return the same error"
    // => If themeId is provided but not found OR not allowed for company, throw the SAME error shape.
    const themePreset = effectiveOverride?.themeId
      ? await this.db.query.storefrontThemes.findFirst({
          where: and(
            eq(storefrontThemes.id, effectiveOverride.themeId as any),
            eq(storefrontThemes.isActive, true),
            // allow global OR company-scoped presets
            sql`(${storefrontThemes.companyId} IS NULL OR ${storefrontThemes.companyId} = ${store.companyId})`,
          ),
        })
      : null;

    // ✅ If themeId was specified (or required), do NOT fall back to base if invalid
    if ((requireTheme || effectiveOverride?.themeId) && !themePreset) {
      // same error whether: theme doesn't exist, inactive, or belongs to another company
      throw new ConflictException({
        code: 'THEME_NOT_READY',
        message: 'Theme preset not found or not accessible for this store',
      });

      // If you truly want 404 instead, swap to:
      // throw new NotFoundException('Storefront theme preset not found');
    }

    // theme
    let resolvedTheme = base.theme ?? {};
    if (themePreset?.theme)
      resolvedTheme = deepMerge(resolvedTheme, themePreset.theme);
    if (effectiveOverride?.theme)
      resolvedTheme = deepMerge(resolvedTheme, effectiveOverride.theme);

    // ui
    let resolvedUi = base.ui ?? {};
    if (themePreset?.ui) resolvedUi = deepMerge(resolvedUi, themePreset.ui);
    if (effectiveOverride?.ui)
      resolvedUi = deepMerge(resolvedUi, effectiveOverride.ui);

    // seo
    let resolvedSeo = base.seo ?? {};
    if (themePreset?.seo) resolvedSeo = deepMerge(resolvedSeo, themePreset.seo);
    if (effectiveOverride?.seo)
      resolvedSeo = deepMerge(resolvedSeo, effectiveOverride.seo);

    // header
    let resolvedHeader = base.header ?? {};
    if (themePreset?.header)
      resolvedHeader = deepMerge(resolvedHeader, themePreset.header);
    if (effectiveOverride?.header)
      resolvedHeader = deepMerge(resolvedHeader, effectiveOverride.header);

    // footer
    let resolvedFooter = base.footer ?? {};
    if (themePreset?.footer)
      resolvedFooter = deepMerge(resolvedFooter, themePreset.footer);
    if (effectiveOverride?.footer)
      resolvedFooter = deepMerge(resolvedFooter, effectiveOverride.footer);

    // pages
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
