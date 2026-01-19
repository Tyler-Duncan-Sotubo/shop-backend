import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import {
  stores,
  storeDomains,
  users,
  storefrontOverrides,
  storefrontBases,
  storefrontThemes,
  companies,
  inventoryLocations,
} from 'src/infrastructure/drizzle/schema';
import { User } from 'src/channels/admin/common/types/user.type';
import { SetupCreateStoreAndDomainDto } from './dto/setup-store.dto';

@Injectable()
export class SetupService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  /* -------------------------------------------------------------------------- */
  /* Helpers                                                                    */
  /* -------------------------------------------------------------------------- */

  normalizeHost(hostRaw: string): string {
    const host = (hostRaw || '').toLowerCase().trim();
    const noPort = host.split(':')[0];
    const noDot = noPort.endsWith('.') ? noPort.slice(0, -1) : noPort;
    return noDot.startsWith('www.') ? noDot.slice(4) : noDot;
  }

  private async ensureSlugUniqueForCompany(
    companyId: string,
    slug: string,
    tx?: db,
  ) {
    const q = (tx ?? this.db)
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.companyId, companyId), eq(stores.slug, slug)));

    const rows = await q.execute();
    if (rows.length > 0) {
      throw new BadRequestException(
        `Slug "${slug}" is already in use for this company.`,
      );
    }
  }

  private normalizeAndValidateDomains(
    domains: SetupCreateStoreAndDomainDto['domains'],
  ) {
    const normalized = (domains ?? [])
      .map((d) => ({
        domain: this.normalizeHost(d.domain),
        isPrimary: !!d.isPrimary,
      }))
      .filter((d) => !!d.domain);

    if (normalized.length === 0) {
      throw new BadRequestException('At least one domain is required.');
    }

    const primaryCount = normalized.filter((d) => d.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException('Only one primary domain is allowed.');
    }

    // Ensure there is exactly one primary
    if (!normalized.some((d) => d.isPrimary)) normalized[0].isPrimary = true;

    // Deduplicate by domain
    const seen = new Set<string>();
    const deduped: Array<{ domain: string; isPrimary: boolean }> = [];
    for (const d of normalized) {
      if (!seen.has(d.domain)) {
        seen.add(d.domain);
        deduped.push(d);
      } else {
        const idx = deduped.findIndex((x) => x.domain === d.domain);
        if (idx >= 0 && d.isPrimary) deduped[idx].isPrimary = true;
      }
    }

    return deduped;
  }

  private async getDefaultBaseId(tx: db) {
    const [base] = await tx
      .select({ id: storefrontBases.id })
      .from(storefrontBases)
      .where(
        and(
          eq(storefrontBases.key, 'default-v1'),
          eq(storefrontBases.isActive, true),
        ),
      )
      .limit(1)
      .execute();

    if (!base?.id) {
      throw new BadRequestException('No default storefront base found');
    }

    return base.id;
  }

  private async getDefaultThemeId(tx: db) {
    const [theme] = await tx
      .select({ id: storefrontThemes.id })
      .from(storefrontThemes)
      .where(
        and(
          eq(storefrontThemes.key, 'theme-v1'),
          eq(storefrontThemes.isActive, true),
        ),
      )
      .limit(1)
      .execute();

    if (!theme?.id) {
      throw new BadRequestException('No default storefront theme found');
    }

    return theme.id;
  }

  /* -------------------------------------------------------------------------- */
  /* Step 1: create store + domains + draft override (no theme required)        */
  /* -------------------------------------------------------------------------- */

  /**
   * Step 1 (required):
   * - create store
   * - create store domains (exactly 1 primary)
   * - create draft storefront override w/ default base (default-v1), themeId=null
   *
   * Theme selection happens later in the app (not here).
   */
  async createStoreWithDomains(
    companyId: string,
    input: SetupCreateStoreAndDomainDto,
    user?: User,
    ip?: string,
  ) {
    const dedupedDomains = this.normalizeAndValidateDomains(input.domains);

    const created = await this.db.transaction(async (tx) => {
      // 0) Load company (and ensure it exists / active)
      const [company] = await tx
        .select({
          id: companies.id,
          name: companies.name,
          plan: companies.plan,
          defaultCurrency: companies.defaultCurrency,
          defaultLocale: companies.defaultLocale,
          timezone: companies.timezone,
          companySize: companies.companySize,
          industry: companies.industry,
          useCase: companies.useCase,
          isActive: companies.isActive,
        })
        .from(companies)
        .where(and(eq(companies.id, companyId), isNull(companies.deletedAt)))
        .limit(1)
        .execute();

      if (!company) throw new NotFoundException('Company not found');
      if (!company.isActive)
        throw new BadRequestException('Company is inactive');

      // (Optional) Update company profile fields if provided in input
      const companyPatch: Record<string, any> = {};
      if ((input as any).companySize)
        companyPatch.companySize = (input as any).companySize;
      if ((input as any).industry)
        companyPatch.industry = (input as any).industry;
      if ((input as any).useCase) companyPatch.useCase = (input as any).useCase;

      let updatedCompany = company;
      if (Object.keys(companyPatch).length > 0) {
        companyPatch.updatedAt = new Date();

        const [c] = await tx
          .update(companies)
          .set(companyPatch)
          .where(eq(companies.id, companyId))
          .returning({
            id: companies.id,
            name: companies.name,
            plan: companies.plan,
            defaultCurrency: companies.defaultCurrency,
            defaultLocale: companies.defaultLocale,
            timezone: companies.timezone,
            companySize: companies.companySize,
            industry: companies.industry,
            useCase: companies.useCase,
            isActive: companies.isActive,
          })
          .execute();

        if (c) updatedCompany = c;
      }

      // 1) slug unique
      await this.ensureSlugUniqueForCompany(companyId, input.slug, tx);

      // 2) domain conflicts within this company (across any store)
      const domainList = dedupedDomains.map((d) => d.domain);

      const conflicts = await tx
        .select({
          domain: storeDomains.domain,
          storeId: storeDomains.storeId,
        })
        .from(storeDomains)
        .innerJoin(stores, eq(stores.id, storeDomains.storeId))
        .where(
          and(
            inArray(storeDomains.domain, domainList),
            eq(stores.companyId, companyId),
            isNull(storeDomains.deletedAt),
          ),
        )
        .execute();

      if (conflicts.length > 0) {
        const conflictList = conflicts
          .map((c) => `${c.domain} (store ID: ${c.storeId})`)
          .join(', ');
        throw new BadRequestException(
          `The following domains are already in use: ${conflictList}`,
        );
      }

      // 3) create store (use company defaults if input not provided)
      const [store] = await tx
        .insert(stores)
        .values({
          companyId,
          name: input.name,
          slug: input.slug,
          defaultCurrency:
            input.defaultCurrency ?? updatedCompany.defaultCurrency ?? 'NGN',
          defaultLocale:
            input.defaultLocale ?? updatedCompany.defaultLocale ?? 'en-NG',
          isActive: input.isActive ?? true,
          supportedCurrencies: input.supportedCurrencies ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning()
        .execute();

      if (!store) throw new BadRequestException('Failed to create store');

      // 3.5) create default warehouse location for this store
      // - isDefault true
      // - type = 'warehouse'
      // - code optional but should be unique per store (your createLocation enforces that)
      // - keep it simple: name "Warehouse" (or `${store.name} Warehouse`)
      // IMPORTANT: do it INSIDE the same transaction (tx)
      const [warehouse] = await tx
        .insert(inventoryLocations)
        .values({
          companyId,
          storeId: store.id,
          name: `${store.name} Warehouse`,
          code: 'WAREHOUSE-001', // change to something safer if you may create multiple stores (see note below)
          type: 'warehouse',
          isDefault: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning()
        .execute();

      // If you use a fixed code like "WH", it will be fine because uniqueness is per-store.
      // If you ever plan to allow multiple warehouses per store in future, change this.

      // 4) insert domains
      const insertedDomains = await tx
        .insert(storeDomains)
        .values(
          dedupedDomains.map((d) => ({
            storeId: store.id,
            domain: d.domain,
            isPrimary: d.isPrimary,
          })),
        )
        .returning()
        .execute();

      // 5) create draft override
      const baseId = await this.getDefaultBaseId(tx);
      const themeId = await this.getDefaultThemeId(tx);

      const [draftOverride] = await tx
        .insert(storefrontOverrides)
        .values({
          companyId,
          storeId: store.id,
          status: 'draft' as any,
          baseId,
          themeId,
          publishedAt: null,
        } as any)
        .returning()
        .execute();

      return {
        company: updatedCompany,
        store,
        warehouse, // ✅ return it so caller knows it exists
        domains: insertedDomains,
        draftOverride,
      };
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'setup',
        entityId: created.store.id,
        userId: user.id,
        ipAddress: ip,
        details:
          'Setup step 1: created store + domains + draft storefront override + default warehouse',
        changes: {
          companyId,
          storeId: created.store.id,
          company: {
            companySize: (created as any).company?.companySize,
            industry: (created as any).company?.industry,
            useCase: (created as any).company?.useCase,
          },
          store: { name: created.store.name, slug: created.store.slug },
          warehouse: {
            id: (created as any).warehouse?.id,
            name: (created as any).warehouse?.name,
            type: (created as any).warehouse?.type,
            isDefault: (created as any).warehouse?.isDefault,
          },
          domains: created.domains.map((d: any) => ({
            domain: d.domain,
            isPrimary: d.isPrimary,
          })),
          override: {
            status: created.draftOverride?.status,
            baseId: created.draftOverride?.baseId,
            themeId: created.draftOverride?.themeId,
          },
        },
      });
    }

    return created;
  }

  /* -------------------------------------------------------------------------- */
  /* Completion: user can skip theme now and continue later                      */
  /* -------------------------------------------------------------------------- */

  /**
   * Mark setup as completed so user can continue to the app.
   * They can still pick a theme later — dashboard can show a warning banner.
   */
  async markSetupCompleted(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new NotFoundException('User not found');

    if (user.onboardingCompleted) {
      return { ok: true, alreadyCompleted: true };
    }

    await this.db
      .update(users)
      .set({ onboardingCompleted: true } as any)
      .where(eq(users.id, userId))
      .execute();

    return { ok: true, alreadyCompleted: false };
  }
}
