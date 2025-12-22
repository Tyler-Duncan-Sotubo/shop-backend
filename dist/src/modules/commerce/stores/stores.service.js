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
exports.StoresService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const company_settings_service_1 = require("../../company-settings/company-settings.service");
let StoresService = class StoresService {
    constructor(db, cache, auditService, companySettingsService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.companySettingsService = companySettingsService;
    }
    async findStoreByIdOrThrow(companyId, storeId) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)),
        });
        if (!store) {
            throw new common_1.NotFoundException(`Store not found for company ${companyId}`);
        }
        return store;
    }
    async ensureSlugUniqueForCompany(companyId, slug, ignoreStoreId) {
        const existing = await this.db
            .select()
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.slug, slug)))
            .execute();
        if (existing.length === 0)
            return;
        if (ignoreStoreId && existing[0].id === ignoreStoreId)
            return;
        throw new common_1.BadRequestException(`Slug "${slug}" is already in use for this company.`);
    }
    async createStore(companyId, payload, user, ip) {
        await this.ensureSlugUniqueForCompany(companyId, payload.slug);
        const [store] = await this.db
            .insert(schema_1.stores)
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
        await this.companySettingsService.markOnboardingStep(companyId, 'store_setup_complete', true);
        return store;
    }
    async getStoresByCompany(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['stores'], async () => {
            return this.db
                .select()
                .from(schema_1.stores)
                .where((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId))
                .execute();
        });
    }
    async getStoreById(companyId, storeId) {
        const cacheKey = ['stores', storeId];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const store = await this.db.query.stores.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)),
            });
            if (!store) {
                throw new common_1.NotFoundException('Store not found');
            }
            return store;
        });
    }
    async updateStore(companyId, storeId, payload, user, ip) {
        const existing = await this.findStoreByIdOrThrow(companyId, storeId);
        if (payload.slug && payload.slug !== existing.slug) {
            await this.ensureSlugUniqueForCompany(companyId, payload.slug, storeId);
        }
        const [updated] = await this.db
            .update(schema_1.stores)
            .set({
            name: payload.name ?? existing.name,
            slug: payload.slug ?? existing.slug,
            defaultCurrency: payload.defaultCurrency ?? existing.defaultCurrency,
            defaultLocale: payload.defaultLocale ?? existing.defaultLocale,
            isActive: payload.isActive === undefined ? existing.isActive : payload.isActive,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Store not found');
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
    async deleteStore(companyId, storeId, user, ip) {
        const existing = await this.findStoreByIdOrThrow(companyId, storeId);
        const [deleted] = await this.db
            .delete(schema_1.stores)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)))
            .returning()
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException('Store not found');
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
    async getStoreDomains(companyId, storeId) {
        await this.findStoreByIdOrThrow(companyId, storeId);
        return this.cache.getOrSetVersioned(companyId, ['store', storeId, 'domains'], async () => {
            return this.db
                .select()
                .from(schema_1.storeDomains)
                .where((0, drizzle_orm_1.eq)(schema_1.storeDomains.storeId, storeId))
                .execute();
        });
    }
    async updateStoreDomains(companyId, storeId, domains, user, ip) {
        await this.findStoreByIdOrThrow(companyId, storeId);
        const primaryCount = domains.filter((d) => d.isPrimary).length;
        if (primaryCount > 1) {
            throw new common_1.BadRequestException('Only one primary domain is allowed per store.');
        }
        await this.db
            .delete(schema_1.storeDomains)
            .where((0, drizzle_orm_1.eq)(schema_1.storeDomains.storeId, storeId))
            .execute();
        let inserted = [];
        if (domains.length > 0) {
            inserted = await this.db
                .insert(schema_1.storeDomains)
                .values(domains.map((d) => ({
                storeId,
                domain: d.domain,
                isPrimary: d.isPrimary ?? false,
            })))
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
    async getCompanyStoresSummary(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['stores-summary'], async () => {
            const companyRow = await this.db.query.companies.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
            });
            if (!companyRow) {
                throw new common_1.NotFoundException('Company not found');
            }
            const storeRows = await this.db
                .select()
                .from(schema_1.stores)
                .where((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId))
                .execute();
            const domainsRows = await this.db.select().from(schema_1.storeDomains).execute();
            const domainsByStore = {};
            for (const d of domainsRows) {
                if (!domainsByStore[d.storeId])
                    domainsByStore[d.storeId] = [];
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
        });
    }
};
exports.StoresService = StoresService;
exports.StoresService = StoresService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], StoresService);
//# sourceMappingURL=stores.service.js.map