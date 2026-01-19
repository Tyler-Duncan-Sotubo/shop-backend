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
var StorefrontConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontConfigService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const schema_2 = require("../schema");
function deepMerge(a, b) {
    if (Array.isArray(a) && Array.isArray(b))
        return b;
    if (isObj(a) && isObj(b)) {
        const out = { ...a };
        for (const k of Object.keys(b))
            out[k] = deepMerge(a?.[k], b[k]);
        return out;
    }
    return b === undefined ? a : b;
}
function isObj(x) {
    return x && typeof x === 'object' && !Array.isArray(x);
}
let StorefrontConfigService = StorefrontConfigService_1 = class StorefrontConfigService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
        this.logger = new common_1.Logger(StorefrontConfigService_1.name);
    }
    async getResolvedByStoreId(storeId, options) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
        });
        if (!store)
            throw new common_1.NotFoundException('Store not found');
        const cacheKey = ['storefront', 'config', 'resolved', 'store', storeId];
        return this.cache.getOrSetCompanyAndGlobalVersioned(store.companyId, cacheKey, async () => {
            const resolved = await this.resolveForStore(storeId, undefined, options);
            const parsed = schema_2.StorefrontConfigV1Schema.safeParse(resolved);
            if (!parsed.success) {
                this.logger.warn(`Resolved storefront config failed zod validation for store=${storeId}: ${parsed.error.message}`);
            }
            return resolved;
        }, { ttlSeconds: 300 });
    }
    async resolveForStore(storeId, candidateOverride, options) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId),
        });
        if (!store)
            throw new common_1.NotFoundException('Store not found');
        const overrideStatus = options?.overrideStatus ?? 'published';
        const publishedOverride = await this.db.query.storefrontOverrides.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, 'published')),
        });
        const draftOverride = overrideStatus === 'published'
            ? undefined
            : await this.db
                .select()
                .from(schema_1.storefrontOverrides)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.storefrontOverrides.status, 'draft')))
                .limit(1)
                .then((rows) => rows[0]);
        const storedOverride = overrideStatus === 'published'
            ? publishedOverride
            : (draftOverride ?? publishedOverride);
        const effectiveOverride = candidateOverride ?? storedOverride ?? undefined;
        const requireThemeMode = (process.env.STOREFRONT_REQUIRE_THEME_MODE ?? 'published').toLowerCase();
        const requireTheme = requireThemeMode === 'always'
            ? true
            : requireThemeMode === 'override'
                ? !!effectiveOverride
                : requireThemeMode === 'published'
                    ? !!publishedOverride
                    : false;
        const base = effectiveOverride?.baseId
            ? await this.db.query.storefrontBases.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontBases.id, effectiveOverride.baseId), (0, drizzle_orm_1.eq)(schema_1.storefrontBases.isActive, true)),
            })
            : await this.db.query.storefrontBases.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontBases.key, 'default-v1'), (0, drizzle_orm_1.eq)(schema_1.storefrontBases.isActive, true)),
            });
        if (!base)
            throw new common_1.NotFoundException('Storefront base not found');
        if (requireTheme && !effectiveOverride?.themeId) {
            throw new common_1.NotFoundException({
                code: 'THEME_NOT_SET',
                message: 'Theme is required but not set for this store',
            });
        }
        const themePreset = effectiveOverride?.themeId
            ? await this.db.query.storefrontThemes.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.id, effectiveOverride.themeId), (0, drizzle_orm_1.eq)(schema_1.storefrontThemes.isActive, true), (0, drizzle_orm_1.sql) `(${schema_1.storefrontThemes.companyId} IS NULL OR ${schema_1.storefrontThemes.companyId} = ${store.companyId})`),
            })
            : null;
        if ((requireTheme || effectiveOverride?.themeId) && !themePreset) {
            throw new common_1.ConflictException({
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
        if (themePreset?.ui)
            resolvedUi = deepMerge(resolvedUi, themePreset.ui);
        if (effectiveOverride?.ui)
            resolvedUi = deepMerge(resolvedUi, effectiveOverride.ui);
        let resolvedSeo = base.seo ?? {};
        if (themePreset?.seo)
            resolvedSeo = deepMerge(resolvedSeo, themePreset.seo);
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
                locale: store.locale ?? undefined,
                currency: store.currency ?? undefined,
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
};
exports.StorefrontConfigService = StorefrontConfigService;
exports.StorefrontConfigService = StorefrontConfigService = StorefrontConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], StorefrontConfigService);
//# sourceMappingURL=storefront-config.service.js.map