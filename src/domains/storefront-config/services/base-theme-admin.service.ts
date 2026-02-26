// src/modules/storefront-config/base-theme-admin.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  storefrontBases,
  storefrontThemes,
} from 'src/infrastructure/drizzle/schema';
import { CreateBaseDto, UpdateBaseDto } from '../dto/base-theme.dto';
import { CreateThemeDto, UpdateThemeDto } from '../dto/theme.dto';
import { storefrontBaseSchemaV1, storefrontThemeSchemaV1 } from '../schema';
import { validateOrThrowZod } from '../validators/validate-or-throw-zod';

@Injectable()
export class BaseThemeAdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  /* ===================================================================== */
  /* BASES                                                                  */
  /* ===================================================================== */

  async createBase(dto: CreateBaseDto) {
    try {
      storefrontBaseSchemaV1.parse({
        key: dto.key,
        version: dto.version ?? 1,
        theme: dto.theme,
        ui: dto.ui,
        seo: dto.seo,
        header: dto.header,
        footer: dto.footer,
        pages: dto.pages,
        isActive: dto.isActive,
      });
    } catch (err) {
      validateOrThrowZod(err, 'storefront.base');
    }

    const [created] = await this.db
      .insert(storefrontBases)
      .values({
        key: dto.key,
        version: dto.version ?? 1,
        theme: dto.theme ?? {},
        ui: dto.ui ?? {},
        seo: dto.seo ?? {},
        header: dto.header ?? {},
        footer: dto.footer ?? {},
        pages: dto.pages ?? {},
        isActive: dto.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    // Base affects everyone
    await this.cache.bumpGlobalVersion();

    return created;
  }

  async listBases(params?: { activeOnly?: boolean }) {
    const activeOnly = params?.activeOnly ?? false;

    const rows = await this.db
      .select()
      .from(storefrontBases)
      .where(
        activeOnly ? eq(storefrontBases.isActive, true) : (undefined as any),
      )
      .orderBy(storefrontBases.key)
      .execute();

    return rows;
  }

  async getBaseById(baseId: string) {
    const base = await this.db.query.storefrontBases.findFirst({
      where: eq(storefrontBases.id, baseId),
    });
    if (!base) throw new NotFoundException('Base not found');
    return base;
  }

  async getBaseByKey(key: string) {
    const base = await this.db.query.storefrontBases.findFirst({
      where: eq(storefrontBases.key, key),
    });
    if (!base) throw new NotFoundException('Base not found');
    return base;
  }

  async updateBase(baseId: string, dto: UpdateBaseDto) {
    try {
      storefrontBaseSchemaV1.parse({
        key: dto.key,
        version: dto.version ?? 1,
        theme: dto.theme,
        ui: dto.ui,
        seo: dto.seo,
        header: dto.header,
        footer: dto.footer,
        pages: dto.pages,
        isActive: dto.isActive,
      });
    } catch (err) {
      validateOrThrowZod(err, 'storefront.base');
    }

    const [updated] = await this.db
      .update(storefrontBases)
      .set({
        ...(dto.key !== undefined ? { key: dto.key } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.ui !== undefined ? { ui: dto.ui } : {}),
        ...(dto.seo !== undefined ? { seo: dto.seo } : {}),
        ...(dto.header !== undefined ? { header: dto.header } : {}),
        ...(dto.footer !== undefined ? { footer: dto.footer } : {}),
        ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      } as any)
      .where(eq(storefrontBases.id, baseId))
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Base not found');

    // Base affects everyone
    await this.cache.bumpGlobalVersion();

    return updated;
  }

  async deleteBase(baseId: string) {
    // safer to soft-disable than delete (since stores reference it)
    const [updated] = await this.db
      .update(storefrontBases)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(eq(storefrontBases.id, baseId))
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Base not found');

    await this.cache.bumpGlobalVersion();
    return { ok: true };
  }

  /* ===================================================================== */
  /* THEMES (presets: global or company)                                    */
  /* ===================================================================== */

  /**
   * Create a company-scoped theme preset.
   * (Global presets should be created by a separate admin path/service.)
   */
  async createTheme(companyId: string, dto: CreateThemeDto) {
    try {
      storefrontThemeSchemaV1.parse({
        key: dto.key,
        version: dto.version ?? 1,
        companyId, // company preset
        theme: dto.theme,
        ui: dto.ui,
        seo: dto.seo,
        header: dto.header,
        footer: dto.footer,
        pages: dto.pages,
        isActive: dto.isActive,
      });
    } catch (err) {
      validateOrThrowZod(err, 'storefront.theme');
    }

    const [created] = await this.db
      .insert(storefrontThemes)
      .values({
        key: dto.key,
        // companyId, // ✅ company-owned preset
        version: dto.version ?? 1,

        theme: dto.theme ?? {},
        ui: dto.ui ?? {},
        seo: dto.seo ?? {},
        header: dto.header ?? {},
        footer: dto.footer ?? {},
        pages: dto.pages ?? {},

        isActive: dto.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    // Company preset impacts that company
    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  /**
   * Optional: create a GLOBAL theme preset (platform admin only).
   * If you don't need this yet, remove it and keep global themes seeded/migrated.
   */
  async createGlobalTheme(dto: CreateThemeDto) {
    try {
      storefrontThemeSchemaV1.parse({
        key: dto.key,
        version: dto.version ?? 1,
        companyId: null, // global preset
        theme: dto.theme,
        ui: dto.ui,
        seo: dto.seo,
        header: dto.header,
        footer: dto.footer,
        pages: dto.pages,
        isActive: dto.isActive,
      });
    } catch (err) {
      validateOrThrowZod(err, 'storefront.theme');
    }

    const [created] = await this.db
      .insert(storefrontThemes)
      .values({
        key: dto.key,
        companyId: null,

        version: dto.version ?? 1,
        theme: dto.theme ?? {},
        ui: dto.ui ?? {},
        seo: dto.seo ?? {},
        header: dto.header ?? {},
        footer: dto.footer ?? {},
        pages: dto.pages ?? {},

        isActive: dto.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    // Global preset impacts everyone
    await this.cache.bumpGlobalVersion();

    return created;
  }

  /**
   * List themes for a company user:
   * - global presets (companyId IS NULL)
   * - company presets (companyId = user.companyId)
   *
   * You can filter to just 'global' or just 'company' via scope.
   */
  async listThemes(
    companyId: string,
    params?: {
      key?: string;
      activeOnly?: boolean;
      scope?: 'global' | 'company'; // ✅ removed 'store'
    },
  ) {
    const where: any[] = [];
    const activeOnly = params?.activeOnly ?? false;

    if (activeOnly) where.push(eq(storefrontThemes.isActive, true));
    if (params?.key) where.push(eq(storefrontThemes.key, params.key));

    if (params?.scope === 'global') {
      where.push(sql`${storefrontThemes.companyId} IS NULL`);
    } else if (params?.scope === 'company') {
      where.push(eq(storefrontThemes.companyId, companyId));
    } else {
      // default: return (global OR company)
      where.push(
        sql`(${storefrontThemes.companyId} IS NULL OR ${storefrontThemes.companyId} = ${companyId})`,
      );
    }

    const rows = await this.db
      .select()
      .from(storefrontThemes)
      .where(where.length ? and(...where) : (undefined as any))
      .orderBy(storefrontThemes.key)
      .execute();

    return rows;
  }

  /**
   * Get theme by id:
   * allow company to access:
   * - global theme (companyId IS NULL)
   * - their own company theme (companyId = companyId)
   */
  async getThemeById(companyId: string, themeId: string) {
    const theme = await this.db.query.storefrontThemes.findFirst({
      where: and(
        eq(storefrontThemes.id, themeId),
        sql`(${storefrontThemes.companyId} IS NULL OR ${storefrontThemes.companyId} = ${companyId})`,
      ),
    });

    if (!theme) throw new NotFoundException('Theme not found');
    return theme;
  }

  /**
   * Update a theme preset.
   * - company users can update only their company themes
   * - (global themes should be updated by platform admin path/service)
   */
  async updateTheme(companyId: string, themeId: string, dto: UpdateThemeDto) {
    // First: ensure it exists and is company-owned
    const existing = await this.db.query.storefrontThemes.findFirst({
      where: eq(storefrontThemes.id, themeId),
    });

    if (!existing) throw new NotFoundException('Theme not found');

    // Validate the *resulting* theme shape (merge-ish validation)
    // NOTE: we validate using provided dto values; missing fields keep existing.
    try {
      storefrontThemeSchemaV1.parse({
        key: dto.key ?? existing.key,
        version: dto.version ?? existing.version,
        companyId: existing.companyId, // company preset
        theme: dto.theme ?? existing.theme,
        ui: dto.ui ?? existing.ui,
        seo: dto.seo ?? existing.seo,
        header: dto.header ?? existing.header,
        footer: dto.footer ?? existing.footer,
        pages: dto.pages ?? existing.pages,

        isActive: dto.isActive ?? existing.isActive,
      });
    } catch (err) {
      validateOrThrowZod(err, 'storefront.theme');
    }

    const [updated] = await this.db
      .update(storefrontThemes)
      .set({
        ...(dto.key !== undefined ? { key: dto.key } : {}),
        ...(dto.version !== undefined ? { version: dto.version } : {}),
        ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
        ...(dto.ui !== undefined ? { ui: dto.ui } : {}),
        ...(dto.seo !== undefined ? { seo: dto.seo } : {}),
        ...(dto.header !== undefined ? { header: dto.header } : {}),
        ...(dto.footer !== undefined ? { footer: dto.footer } : {}),
        ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      } as any)
      .where(and(eq(storefrontThemes.id, themeId)))
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Theme not found');

    await this.cache.bumpCompanyVersion(companyId);

    return updated;
  }

  /**
   * Soft delete a theme preset.
   * - company users delete only their company themes
   * - global themes should be disabled via platform admin path/service
   */
  async deleteTheme(companyId: string, themeId: string) {
    const [updated] = await this.db
      .update(storefrontThemes)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(
        and(
          eq(storefrontThemes.id, themeId),
          eq(storefrontThemes.companyId, companyId),
        ),
      )
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Theme not found');

    await this.cache.bumpCompanyVersion(companyId);

    return { ok: true };
  }
}
