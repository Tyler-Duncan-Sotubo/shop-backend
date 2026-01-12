"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseThemeAdminService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const cache_service_1 = require("../../../common/cache/cache.service");
const schema_1 = require("../../../drizzle/schema");
const schema_2 = require("../schema");
const validate_or_throw_zod_1 = require("../validators/validate-or-throw-zod");
let BaseThemeAdminService = class BaseThemeAdminService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async createBase(dto) {
        try {
            schema_2.storefrontBaseSchemaV1.parse({
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
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.base');
        }
        const [created] = await this.db
            .insert(schema_1.storefrontBases)
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
        })
            .returning()
            .execute();
        await this.cache.bumpGlobalVersion();
        return created;
    }
    async listBases(params) {
        const activeOnly = params?.activeOnly ?? false;
        const rows = await this.db
            .select()
            .from(schema_1.storefrontBases)
            .where(activeOnly ? (0, drizzle_orm_1.eq)(schema_1.storefrontBases.isActive, true) : undefined)
            .orderBy(schema_1.storefrontBases.key)
            .execute();
        return rows;
    }
    async getBaseById(baseId) {
        const base = await this.db.query.storefrontBases.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.storefrontBases.id, baseId),
        });
        if (!base)
            throw new common_1.NotFoundException('Base not found');
        return base;
    }
    async getBaseByKey(key) {
        const base = await this.db.query.storefrontBases.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.storefrontBases.key, key),
        });
        if (!base)
            throw new common_1.NotFoundException('Base not found');
        return base;
    }
    async updateBase(baseId, dto) {
        try {
            schema_2.storefrontBaseSchemaV1.parse({
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
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.base');
        }
        const [updated] = await this.db
            .update(schema_1.storefrontBases)
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
        })
            .where((0, drizzle_orm_1.eq)(schema_1.storefrontBases.id, baseId))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Base not found');
        await this.cache.bumpGlobalVersion();
        return updated;
    }
    async deleteBase(baseId) {
        const [updated] = await this.db
            .update(schema_1.storefrontBases)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_1.storefrontBases.id, baseId))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Base not found');
        await this.cache.bumpGlobalVersion();
        return { ok: true };
    }
    async createTheme(companyId, dto) {
        try {
            schema_2.storefrontThemeSchemaV1.parse({
                key: dto.key,
                version: dto.version ?? 1,
                companyId,
                theme: dto.theme,
                ui: dto.ui,
                seo: dto.seo,
                header: dto.header,
                footer: dto.footer,
                pages: dto.pages,
                isActive: dto.isActive,
            });
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.theme');
        }
        const [created] = await this.db
            .insert(schema_1.storefrontThemes)
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
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async createGlobalTheme(dto) {
        try {
            schema_2.storefrontThemeSchemaV1.parse({
                key: dto.key,
                version: dto.version ?? 1,
                companyId: null,
                theme: dto.theme,
                ui: dto.ui,
                seo: dto.seo,
                header: dto.header,
                footer: dto.footer,
                pages: dto.pages,
                isActive: dto.isActive,
            });
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.theme');
        }
        const [created] = await this.db
            .insert(schema_1.storefrontThemes)
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
        })
            .returning()
            .execute();
        await this.cache.bumpGlobalVersion();
        return created;
    }
    async listThemes(companyId, params) {
        const where = [];
        const activeOnly = params?.activeOnly ?? false;
        if (activeOnly)
            where.push((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.isActive, true));
        if (params?.key)
            where.push((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.key, params.key));
        if (params?.scope === 'global') {
            where.push((0, drizzle_orm_1.sql) `${schema_1.storefrontThemes.companyId} IS NULL`);
        }
        else if (params?.scope === 'company') {
            where.push((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.companyId, companyId));
        }
        else {
            where.push((0, drizzle_orm_1.sql) `(${schema_1.storefrontThemes.companyId} IS NULL OR ${schema_1.storefrontThemes.companyId} = ${companyId})`);
        }
        const rows = await this.db
            .select()
            .from(schema_1.storefrontThemes)
            .where(where.length ? (0, drizzle_orm_1.and)(...where) : undefined)
            .orderBy(schema_1.storefrontThemes.key)
            .execute();
        return rows;
    }
    async getThemeById(companyId, themeId) {
        const theme = await this.db.query.storefrontThemes.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.id, themeId), (0, drizzle_orm_1.sql) `(${schema_1.storefrontThemes.companyId} IS NULL OR ${schema_1.storefrontThemes.companyId} = ${companyId})`),
        });
        if (!theme)
            throw new common_1.NotFoundException('Theme not found');
        return theme;
    }
    async updateTheme(companyId, themeId, dto) {
        const existing = await this.db.query.storefrontThemes.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.id, themeId), (0, drizzle_orm_1.eq)(schema_1.storefrontThemes.companyId, companyId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Theme not found');
        try {
            schema_2.storefrontThemeSchemaV1.parse({
                key: dto.key ?? existing.key,
                version: dto.version ?? existing.version,
                companyId: existing.companyId,
                theme: dto.theme ?? existing.theme,
                ui: dto.ui ?? existing.ui,
                seo: dto.seo ?? existing.seo,
                header: dto.header ?? existing.header,
                footer: dto.footer ?? existing.footer,
                pages: dto.pages ?? existing.pages,
                isActive: dto.isActive ?? existing.isActive,
            });
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.theme');
        }
        const [updated] = await this.db
            .update(schema_1.storefrontThemes)
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
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.id, themeId), (0, drizzle_orm_1.eq)(schema_1.storefrontThemes.companyId, companyId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Theme not found');
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async deleteTheme(companyId, themeId) {
        const [updated] = await this.db
            .update(schema_1.storefrontThemes)
            .set({ isActive: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.id, themeId), (0, drizzle_orm_1.eq)(schema_1.storefrontThemes.companyId, companyId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Theme not found');
        await this.cache.bumpCompanyVersion(companyId);
        return { ok: true };
    }
};
exports.BaseThemeAdminService = BaseThemeAdminService;
exports.BaseThemeAdminService = BaseThemeAdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], BaseThemeAdminService);
//# sourceMappingURL=base-theme-admin.service.js.map