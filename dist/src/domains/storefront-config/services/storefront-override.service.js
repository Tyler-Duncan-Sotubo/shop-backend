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
exports.StorefrontOverrideService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const schema_2 = require("../schema");
const storefront_config_service_1 = require("./storefront-config.service");
const validate_or_throw_zod_1 = require("../validators/validate-or-throw-zod");
const storefront_revalidate_service_1 = require("./storefront-revalidate.service");
const company_settings_service_1 = require("../../company-settings/company-settings.service");
let StorefrontOverrideService = class StorefrontOverrideService {
    constructor(db, cache, storefrontConfigService, storefrontRevalidateService, companySettings) {
        this.db = db;
        this.cache = cache;
        this.storefrontConfigService = storefrontConfigService;
        this.storefrontRevalidateService = storefrontRevalidateService;
        this.companySettings = companySettings;
    }
    async assertStore(storeId) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
            columns: { id: true, companyId: true },
        });
        if (!store)
            throw new common_1.NotFoundException('Store not found');
        return store;
    }
    async getPublishedOverride(companyId, storeId) {
        await this.assertStore(storeId);
        return this.db.query.storefrontOverrides.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, 'published')),
        });
    }
    validateOverridePayloadOrThrow(input) {
        try {
            schema_2.StorefrontOverridesV1Schema.parse(input);
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.override.payload');
        }
    }
    async upsertOverride(companyId, storeId, dto) {
        const store = await this.assertStore(storeId);
        const status = dto.status ?? 'draft';
        this.validateOverridePayloadOrThrow({
            ...(dto.theme !== undefined ? { theme: dto.theme } : {}),
            ...(dto.ui !== undefined ? { ui: dto.ui } : {}),
            ...(dto.seo !== undefined ? { seo: dto.seo } : {}),
            ...(dto.header !== undefined ? { header: dto.header } : {}),
            ...(dto.footer !== undefined ? { footer: dto.footer } : {}),
            ...(dto.pages !== undefined ? { pages: dto.pages } : {}),
        });
        const [updated] = await this.db
            .update(schema_1.storefrontOverrides)
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
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.companyId, store.companyId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, status)))
            .returning()
            .execute();
        if (status === 'published') {
            await this.storefrontRevalidateService.revalidateStorefront(storeId);
        }
        if (updated) {
            await this.cache.bumpCompanyVersion(store.companyId);
            return updated;
        }
        const [created] = await this.db
            .insert(schema_1.storefrontOverrides)
            .values({
            companyId: store.companyId,
            storeId,
            baseId: dto.baseId,
            themeId: dto.themeId ?? null,
            theme: dto.theme ?? {},
            ui: dto.ui ?? {},
            seo: dto.seo ?? {},
            header: dto.header ?? {},
            footer: dto.footer ?? {},
            pages: dto.pages ?? {},
            status: status,
            publishedAt: status === 'published' ? new Date() : null,
            updatedAt: new Date(),
        })
            .returning()
            .execute();
        if (status === 'published') {
            await this.storefrontRevalidateService.revalidateStorefront(storeId);
        }
        await this.cache.bumpCompanyVersion(store.companyId);
        return created;
    }
    async publishDraft(companyId, storeId) {
        const store = await this.assertStore(storeId);
        const draft = await this.db.query.storefrontOverrides.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, 'draft')),
        });
        if (!draft)
            throw new common_1.NotFoundException('Draft override not found');
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
        const resolved = await this.storefrontConfigService.resolveForStore(storeId, {
            baseId: draft.baseId,
            themeId: draft.themeId,
            theme: draft.theme,
            ui: draft.ui,
            seo: draft.seo,
            header: draft.header,
            footer: draft.footer,
            pages: draft.pages,
        });
        try {
            schema_2.StorefrontConfigV1Schema.parse(resolved);
        }
        catch (err) {
            (0, validate_or_throw_zod_1.validateOrThrowZod)(err, 'storefront.publish.resolved');
        }
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
        await this.storefrontRevalidateService.revalidateStorefront(storeId);
        await this.companySettings.markOnboardingStep(companyId, 'online_store_customization_complete', true);
        return { ok: true };
    }
    async getStorefrontOverrideStatus(companyId, storeId) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
        });
        if (!store)
            throw new common_1.NotFoundException('Store not found');
        const published = await this.db.query.storefrontOverrides.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, 'published')),
            columns: {
                id: true,
                themeId: true,
                baseId: true,
                updatedAt: true,
                createdAt: true,
            },
        });
        const draft = await this.db.query.storefrontOverrides.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, 'draft')),
            columns: {
                id: true,
                themeId: true,
                baseId: true,
                updatedAt: true,
                createdAt: true,
            },
        });
        const requireThemeMode = (process.env.STOREFRONT_REQUIRE_THEME_MODE ?? 'published').toLowerCase();
        const requireTheme = requireThemeMode === 'always'
            ? true
            : requireThemeMode === 'override'
                ? !!(draft ?? published)
                : requireThemeMode === 'published'
                    ? !!published
                    : false;
        return {
            storeId,
            requireTheme,
            published: published
                ? {
                    exists: true,
                    themeId: published.themeId ?? null,
                    baseId: published.baseId ?? null,
                    updatedAt: published.updatedAt ?? null,
                    createdAt: published.createdAt ?? null,
                }
                : {
                    exists: false,
                    themeId: null,
                    baseId: null,
                    updatedAt: null,
                    createdAt: null,
                },
            draft: draft
                ? {
                    exists: true,
                    themeId: draft.themeId ?? null,
                    baseId: draft.baseId ?? null,
                    updatedAt: draft.updatedAt ?? null,
                    createdAt: draft.createdAt ?? null,
                }
                : {
                    exists: false,
                    themeId: null,
                    baseId: null,
                    updatedAt: null,
                    createdAt: null,
                },
            isLive: !!published?.themeId,
            hasDraftChanges: !!draft,
            publishedThemeId: published?.themeId ?? null,
            draftThemeId: draft?.themeId ?? null,
        };
    }
};
exports.StorefrontOverrideService = StorefrontOverrideService;
exports.StorefrontOverrideService = StorefrontOverrideService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        storefront_config_service_1.StorefrontConfigService,
        storefront_revalidate_service_1.StorefrontRevalidateService,
        company_settings_service_1.CompanySettingsService])
], StorefrontOverrideService);
//# sourceMappingURL=storefront-override.service.js.map