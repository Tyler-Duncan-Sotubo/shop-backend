import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { companies, stores, storeDomains } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateStoreDto } from './dto/create-store.dto';
import { CompanySettingsService } from '../../company-settings/company-settings.service';

@Injectable()
export class StoresService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly companySettingsService: CompanySettingsService,
  ) {}

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async findStoreByIdOrThrow(companyId: string, storeId: string) {
    const store = await this.db.query.stores.findFirst({
      where: and(eq(stores.companyId, companyId), eq(stores.id, storeId)),
    });

    if (!store) {
      throw new NotFoundException(`Store not found for company ${companyId}`);
    }

    return store;
  }

  private async ensureSlugUniqueForCompany(
    companyId: string,
    slug: string,
    ignoreStoreId?: string,
  ) {
    const existing = await this.db
      .select()
      .from(stores)
      .where(and(eq(stores.companyId, companyId), eq(stores.slug, slug)))
      .execute();

    if (existing.length === 0) return;

    // If we’re updating, allow the same store to keep its slug
    if (ignoreStoreId && existing[0].id === ignoreStoreId) return;

    throw new BadRequestException(
      `Slug "${slug}" is already in use for this company.`,
    );
  }

  // --------------------------------------------------------------------------
  // Stores (CRUD)
  // --------------------------------------------------------------------------

  async createStore(
    companyId: string,
    payload: CreateStoreDto,
    user?: User,
    ip?: string,
  ) {
    await this.ensureSlugUniqueForCompany(companyId, payload.slug);

    const [store] = await this.db
      .insert(stores)
      .values({
        companyId,
        name: payload.name,
        slug: payload.slug,
        defaultCurrency: payload.defaultCurrency ?? 'NGN',
        defaultLocale: payload.defaultLocale ?? 'en-US',
        isActive: payload.isActive ?? true,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'store',
        entityId: store.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created store',
        changes: {
          companyId,
          storeId: store.id,
          name: store.name,
          slug: store.slug,
        },
      });
    }

    await this.companySettingsService.markOnboardingStep(
      companyId,
      'store_setup_complete',
      true,
    );

    return store;
  }

  async getStoresByCompany(companyId: string) {
    return this.cache.getOrSetVersioned(companyId, ['stores'], async () => {
      return this.db
        .select()
        .from(stores)
        .where(eq(stores.companyId, companyId))
        .execute();
    });
  }

  async getStoreById(companyId: string, storeId: string) {
    const cacheKey = ['stores', storeId];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const store = await this.db.query.stores.findFirst({
        where: and(eq(stores.companyId, companyId), eq(stores.id, storeId)),
      });

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      return store;
    });
  }

  async updateStore(
    companyId: string,
    storeId: string,
    payload: {
      name?: string;
      slug?: string;
      defaultCurrency?: string;
      defaultLocale?: string;
      isActive?: boolean;
    },
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findStoreByIdOrThrow(companyId, storeId);

    if (payload.slug && payload.slug !== existing.slug) {
      await this.ensureSlugUniqueForCompany(companyId, payload.slug, storeId);
    }

    const [updated] = await this.db
      .update(stores)
      .set({
        name: payload.name ?? existing.name,
        slug: payload.slug ?? existing.slug,
        defaultCurrency: payload.defaultCurrency ?? existing.defaultCurrency,
        defaultLocale: payload.defaultLocale ?? existing.defaultLocale,
        isActive:
          payload.isActive === undefined ? existing.isActive : payload.isActive,
      })
      .where(and(eq(stores.companyId, companyId), eq(stores.id, storeId)))
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Store not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'store',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated store',
        changes: {
          companyId,
          storeId: updated.id,
          before: {
            name: existing.name,
            slug: existing.slug,
            defaultCurrency: existing.defaultCurrency,
            defaultLocale: existing.defaultLocale,
            isActive: existing.isActive,
          },
          after: {
            name: updated.name,
            slug: updated.slug,
            defaultCurrency: updated.defaultCurrency,
            defaultLocale: updated.defaultLocale,
            isActive: updated.isActive,
          },
        },
      });
    }

    return updated;
  }

  async deleteStore(
    companyId: string,
    storeId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findStoreByIdOrThrow(companyId, storeId);

    const [deleted] = await this.db
      .delete(stores)
      .where(and(eq(stores.companyId, companyId), eq(stores.id, storeId)))
      .returning()
      .execute();

    if (!deleted) {
      throw new NotFoundException('Store not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'store',
        entityId: storeId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted store',
        changes: {
          companyId,
          storeId,
          name: existing.name,
          slug: existing.slug,
        },
      });
    }

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Store domains (custom domain mapping)
  // --------------------------------------------------------------------------

  async getStoreDomains(companyId: string, storeId: string) {
    // Ensure store exists & belongs to company
    await this.findStoreByIdOrThrow(companyId, storeId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['store', storeId, 'domains'],
      async () => {
        return this.db
          .select()
          .from(storeDomains)
          .where(eq(storeDomains.storeId, storeId))
          .execute();
      },
    );
  }

  /**
   * Replace all domains for a store with the given list.
   * This is similar in spirit to `updateCompanyRolePermissions`:
   * wipe current rows, insert new set, log, bump version.
   */
  async updateStoreDomains(
    companyId: string,
    storeId: string,
    domains: Array<{
      domain: string;
      isPrimary?: boolean;
    }>,
    user?: User,
    ip?: string,
  ) {
    await this.findStoreByIdOrThrow(companyId, storeId);

    // If more than one primary is set, throw
    const primaryCount = domains.filter((d) => d.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException(
        'Only one primary domain is allowed per store.',
      );
    }

    // Clear existing
    await this.db
      .delete(storeDomains)
      .where(eq(storeDomains.storeId, storeId))
      .execute();

    let inserted: (typeof storeDomains.$inferSelect)[] = [];
    if (domains.length > 0) {
      inserted = await this.db
        .insert(storeDomains)
        .values(
          domains.map((d) => ({
            storeId,
            domain: d.domain,
            isPrimary: d.isPrimary ?? false,
          })),
        )
        .returning()
        .execute();
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'store_domains',
        entityId: storeId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated store domains',
        changes: {
          companyId,
          storeId,
          domains,
        },
      });
    }

    return inserted;
  }

  // --------------------------------------------------------------------------
  // Summary (stores + domains) – similar to getCompanyPermissionsSummary
  // --------------------------------------------------------------------------

  async getCompanyStoresSummary(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['stores-summary'],
      async () => {
        const companyRow = await this.db.query.companies.findFirst({
          where: eq(companies.id, companyId),
        });

        if (!companyRow) {
          throw new NotFoundException('Company not found');
        }

        const storeRows = await this.db
          .select()
          .from(stores)
          .where(eq(stores.companyId, companyId))
          .execute();

        const domainsRows = await this.db.select().from(storeDomains).execute();

        // Group domains by storeId
        const domainsByStore: Record<string, typeof domainsRows> = {};
        for (const d of domainsRows) {
          if (!domainsByStore[d.storeId]) domainsByStore[d.storeId] = [];
          domainsByStore[d.storeId].push(d);
        }

        return {
          company: {
            id: companyRow.id,
            name: companyRow.name,
            slug: companyRow.slug,
          },
          stores: storeRows.map((s) => ({
            ...s,
            domains: domainsByStore[s.id] ?? [],
          })),
        };
      },
    );
  }
}
