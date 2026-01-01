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
import { AwsService } from 'src/common/aws/aws.service';
import { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly companySettingsService: CompanySettingsService,
    private readonly aws: AwsService,
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

    const created = await this.db.transaction(async (tx) => {
      const [store] = await tx
        .insert(stores)
        .values({
          companyId,
          name: payload.name,
          slug: payload.slug,
          defaultCurrency: payload.defaultCurrency ?? 'NGN',
          defaultLocale: payload.defaultLocale ?? 'en-US',
          isActive: payload.isActive ?? true,

          // optionally set null first; we'll update after upload
          imageUrl: null,
          imageAltText: payload.imageAltText ?? null,
        })
        .returning()
        .execute();

      // ✅ upload if base64 provided
      if (payload.base64Image) {
        const fileName = `${store.id}-cover-${Date.now()}.jpg`;

        // Uses the SAME upload helper you already use in product create
        const url = await this.aws.uploadImageToS3(
          companyId,
          fileName,
          payload.base64Image,
        );

        const [updated] = await tx
          .update(stores)
          .set({
            imageUrl: url,
            imageAltText: payload.imageAltText ?? `${store.name} cover image`,
            updatedAt: new Date(),
          })
          .where(and(eq(stores.companyId, companyId), eq(stores.id, store.id)))
          .returning()
          .execute();

        return updated ?? store;
      }

      return store;
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'store',
        entityId: created.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created store',
        changes: {
          companyId,
          storeId: created.id,
          name: created.name,
          slug: created.slug,
          imageUrl: created.imageUrl ?? null,
        },
      });
    }

    await this.companySettingsService.markOnboardingStep(
      companyId,
      'store_setup_complete',
      true,
    );

    return created;
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
    payload: UpdateStoreDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findStoreByIdOrThrow(companyId, storeId);

    if (payload.slug && payload.slug !== existing.slug) {
      await this.ensureSlugUniqueForCompany(companyId, payload.slug, storeId);
    }

    const updated = await this.db.transaction(async (tx) => {
      // 1) If base64 image exists, upload first and set the url
      let uploadedUrl: string | null | undefined = undefined;

      if (payload.base64Image) {
        const fileName = `${storeId}-cover-${Date.now()}.jpg`;

        uploadedUrl = await this.aws.uploadImageToS3(
          companyId,
          fileName,
          payload.base64Image,
        );
      }

      // 2) handle removeImage (optional)
      const nextImageUrl =
        payload.removeImage === true
          ? null
          : uploadedUrl !== undefined
            ? uploadedUrl
            : (existing.imageUrl ?? null);

      const nextAlt =
        payload.removeImage === true
          ? null
          : payload.imageAltText !== undefined
            ? payload.imageAltText
            : ((existing as any).imageAltText ?? null);

      const [row] = await tx
        .update(stores)
        .set({
          name: payload.name ?? existing.name,
          slug: payload.slug ?? existing.slug,
          defaultCurrency: payload.defaultCurrency ?? existing.defaultCurrency,
          defaultLocale: payload.defaultLocale ?? existing.defaultLocale,
          isActive:
            payload.isActive === undefined
              ? existing.isActive
              : payload.isActive,

          // ✅ NEW fields
          imageUrl: nextImageUrl,
          // remove this line if you don't have imageAltText column
          imageAltText: nextAlt,

          // remove if you don't have updatedAt
          updatedAt: new Date(),
        })
        .where(and(eq(stores.companyId, companyId), eq(stores.id, storeId)))
        .returning()
        .execute();

      if (!row) throw new NotFoundException('Store not found');
      return row;
    });

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
            imageUrl: existing.imageUrl ?? null,
            imageAltText: (existing as any).imageAltText ?? null,
          },
          after: {
            name: updated.name,
            slug: updated.slug,
            defaultCurrency: updated.defaultCurrency,
            defaultLocale: updated.defaultLocale,
            isActive: updated.isActive,
            imageUrl: updated.imageUrl ?? null,
            imageAltText: (updated as any).imageAltText ?? null,
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
