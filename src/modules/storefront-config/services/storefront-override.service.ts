import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { storefrontOverrides, stores } from 'src/drizzle/schema';
import { UpsertStorefrontOverrideDto } from '../dto/upsert-storefront-override.dto';
import {
  StorefrontConfigV1Schema,
  StorefrontOverridesV1Schema, // ✅ add this export from ../schema
} from '../schema';
import { StorefrontConfigService } from './storefront-config.service';
import { validateOrThrowZod } from '../validators/validate-or-throw-zod';
import { StorefrontRevalidateService } from './storefront-revalidate.service';

@Injectable()
export class StorefrontOverrideService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly storefrontConfigService: StorefrontConfigService,
    private readonly storefrontRevalidateService: StorefrontRevalidateService,
  ) {}

  private async assertStore(storeId: string) {
    const store = await this.db.query.stores.findFirst({
      where: eq(stores.id, storeId),
      columns: { id: true, companyId: true } as any,
    });
    if (!store) throw new NotFoundException('Store not found');
    return store as any;
  }

  async getPublishedOverride(companyId: string, storeId: string) {
    await this.assertStore(storeId);
    return this.db.query.storefrontOverrides.findFirst({
      where: and(
        eq(storefrontOverrides.companyId, companyId),
        eq(storefrontOverrides.storeId, storeId),
        eq(storefrontOverrides.status, 'published' as any),
      ),
    });
  }

  /**
   * Validates only the override payload (NOT the resolved config).
   * This prevents garbage/unknown keys from being saved (draft or published),
   * and ensures admin can only edit allowed fields.
   */
  private validateOverridePayloadOrThrow(input: {
    theme?: unknown;
    ui?: unknown;
    seo?: unknown;
    header?: unknown;
    footer?: unknown;
    pages?: unknown;
  }) {
    try {
      StorefrontOverridesV1Schema.parse(input);
    } catch (err) {
      validateOrThrowZod(err, 'storefront.override.payload');
    }
  }

  /**
   * Upsert draft OR published override.
   * - If status="draft", it creates/updates draft row.
   * - If status="published", it creates/updates published row.
   */
  async upsertOverride(
    companyId: string,
    storeId: string,
    dto: UpsertStorefrontOverrideDto,
  ) {
    const store = await this.assertStore(storeId);
    const status = dto.status ?? 'draft';

    // ✅ Validate the override payload BEFORE writing to DB.
    // Only include keys that are present on this request, so partial updates work.
    this.validateOverridePayloadOrThrow({
      ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
      ...(dto.ui !== undefined ? { ui: dto.ui } : {}),
      ...(dto.seo !== undefined ? { seo: dto.seo } : {}),
      ...(dto.header !== undefined ? { header: dto.header } : {}),
      ...(dto.footer !== undefined ? { footer: dto.footer } : {}),
      ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
    });

    // update if exists
    const [updated] = await this.db
      .update(storefrontOverrides)
      .set({
        ...(dto.baseId !== undefined ? { baseId: dto.baseId } : {}),
        ...(dto.themeId !== undefined ? { themeId: dto.themeId } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.ui !== undefined ? { ui: dto.ui } : {}),
        ...(dto.seo !== undefined ? { seo: dto.seo } : {}),
        ...(dto.header !== undefined ? { header: dto.header } : {}),
        ...(dto.footer !== undefined ? { footer: dto.footer } : {}),
        ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
        ...(status === 'published' ? { publishedAt: new Date() } : {}),
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(storefrontOverrides.companyId, store.companyId),
          eq(storefrontOverrides.storeId, storeId),
          eq(storefrontOverrides.status, status as any),
        ),
      )
      .returning()
      .execute();

    if (status === 'published') {
      await this.storefrontRevalidateService.revalidateStorefront(storeId);
    }

    if (updated) {
      await this.cache.bumpCompanyVersion(store.companyId);
      return updated;
    }

    // insert if not exists
    const [created] = await this.db
      .insert(storefrontOverrides)
      .values({
        companyId: store.companyId,
        storeId,
        baseId: dto.baseId!, // require for first insert; enforce in DTO validation
        themeId: dto.themeId ?? null,
        theme: dto.theme ?? {},
        ui: dto.ui ?? {},
        seo: dto.seo ?? {},
        header: dto.header ?? {},
        footer: dto.footer ?? {},
        pages: dto.pages ?? {},
        status: status as any,
        publishedAt: status === 'published' ? new Date() : null,
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    if (status === 'published') {
      await this.storefrontRevalidateService.revalidateStorefront(storeId);
    }

    await this.cache.bumpCompanyVersion(store.companyId);
    return created;
  }

  /**
   * Publish draft -> published (optional workflow):
   * - copy draft row fields into published row
   * - keeps baseId/themeId consistent
   * - validate:
   *   1) the override shape (admin-allowed subset)
   *   2) the resolved config shape (StorefrontConfigV1Schema)
   */
  async publishDraft(companyId: string, storeId: string) {
    const store = await this.assertStore(storeId);

    const draft = await this.db.query.storefrontOverrides.findFirst({
      where: and(
        eq(storefrontOverrides.storeId, storeId),
        eq(storefrontOverrides.status, 'draft' as any),
      ),
    });
    if (!draft) throw new NotFoundException('Draft override not found');

    // ✅ Validate the override data stored in draft (defensive: DB may contain older invalid rows)
    this.validateOverridePayloadOrThrow({
      theme: draft.theme ?? {},
      ui: draft.ui ?? {},
      seo: draft.seo ?? {},
      header: draft.header ?? {},
      footer: draft.footer ?? {},
      pages: draft.pages ?? {},
    });

    const candidateOverride = {
      baseId: draft.baseId,
      themeId: draft.themeId,
      theme: draft.theme,
      ui: draft.ui,
      seo: draft.seo,
      header: draft.header,
      footer: draft.footer,
      pages: draft.pages,
    };

    // Resolve config (base + theme + candidate override)
    const resolved = await this.storefrontConfigService.resolveForStore(
      storeId,
      {
        baseId: draft.baseId,
        themeId: draft.themeId,
        theme: draft.theme,
        ui: draft.ui,
        seo: draft.seo,
        header: draft.header,
        footer: draft.footer,
        pages: draft.pages,
      },
    );

    // ✅ Validate the FINAL resolved runtime config
    try {
      StorefrontConfigV1Schema.parse(resolved);
    } catch (err) {
      validateOrThrowZod(err, 'storefront.publish.resolved');
    }

    // ✅ Now publish (upsert into published)
    await this.upsertOverride(companyId, storeId, {
      status: 'published',
      baseId: candidateOverride.baseId,
      themeId: candidateOverride.themeId,
      theme: candidateOverride.theme,
      ui: candidateOverride.ui,
      seo: candidateOverride.seo,
      header: candidateOverride.header,
      footer: candidateOverride.footer,
      pages: candidateOverride.pages,
    });

    await this.cache.bumpCompanyVersion(store.companyId);

    return { ok: true };
  }
}
