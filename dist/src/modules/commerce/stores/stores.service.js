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
const aws_service_1 = require("../../../common/aws/aws.service");
let StoresService = class StoresService {
    constructor(db, cache, auditService, aws) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.aws = aws;
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
        const created = await this.db.transaction(async (tx) => {
            const [store] = await tx
                .insert(schema_1.stores)
                .values({
                companyId,
                name: payload.name,
                slug: payload.slug,
                defaultCurrency: payload.defaultCurrency ?? 'NGN',
                defaultLocale: payload.defaultLocale ?? 'en-US',
                isActive: payload.isActive ?? true,
                supportedCurrencies: payload.supportedCurrencies ?? ['NGN'],
                imageUrl: null,
                imageAltText: payload.imageAltText ?? null,
            })
                .returning()
                .execute();
            if (payload.base64Image) {
                const fileName = `${store.id}-cover-${Date.now()}.jpg`;
                const url = await this.aws.uploadImageToS3(companyId, fileName, payload.base64Image);
                const [updated] = await tx
                    .update(schema_1.stores)
                    .set({
                    imageUrl: url,
                    imageAltText: payload.imageAltText ?? `${store.name} cover image`,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, store.id)))
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
        return created;
    }
    async getStoresByCompany(companyId) {
        const storeRows = await this.db
            .select()
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId))
            .execute();
        if (storeRows.length === 0)
            return [];
        const storeIds = storeRows.map((s) => s.id);
        const domainsRows = await this.db
            .select({
            storeId: schema_1.storeDomains.storeId,
            domain: schema_1.storeDomains.domain,
            isPrimary: schema_1.storeDomains.isPrimary,
        })
            .from(schema_1.storeDomains)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.storeDomains.storeId, storeIds), (0, drizzle_orm_1.isNull)(schema_1.storeDomains.deletedAt)))
            .execute();
        const domainsByStore = {};
        for (const d of domainsRows) {
            if (!domainsByStore[d.storeId]) {
                domainsByStore[d.storeId] = { all: [] };
            }
            domainsByStore[d.storeId].all.push(d.domain);
            if (d.isPrimary) {
                domainsByStore[d.storeId].primary = d.domain;
            }
        }
        return storeRows.map((s) => ({
            ...s,
            primaryDomain: domainsByStore[s.id]?.primary ?? null,
            domains: domainsByStore[s.id]?.all ?? [],
        }));
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
        const updated = await this.db.transaction(async (tx) => {
            let uploadedUrl = undefined;
            if (payload.base64Image) {
                const fileName = `${storeId}-cover-${Date.now()}.jpg`;
                uploadedUrl = await this.aws.uploadImageToS3(companyId, fileName, payload.base64Image);
            }
            const nextImageUrl = payload.removeImage === true
                ? null
                : uploadedUrl !== undefined
                    ? uploadedUrl
                    : (existing.imageUrl ?? null);
            const nextAlt = payload.removeImage === true
                ? null
                : payload.imageAltText !== undefined
                    ? payload.imageAltText
                    : (existing.imageAltText ?? null);
            const [row] = await tx
                .update(schema_1.stores)
                .set({
                name: payload.name ?? existing.name,
                slug: payload.slug ?? existing.slug,
                defaultCurrency: payload.defaultCurrency ?? existing.defaultCurrency,
                defaultLocale: payload.defaultLocale ?? existing.defaultLocale,
                isActive: payload.isActive === undefined
                    ? existing.isActive
                    : payload.isActive,
                supportedCurrencies: payload.supportedCurrencies ?? existing.supportedCurrencies,
                imageUrl: nextImageUrl,
                imageAltText: nextAlt,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)))
                .returning()
                .execute();
            if (!row)
                throw new common_1.NotFoundException('Store not found');
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
                        imageAltText: existing.imageAltText ?? null,
                    },
                    after: {
                        name: updated.name,
                        slug: updated.slug,
                        defaultCurrency: updated.defaultCurrency,
                        defaultLocale: updated.defaultLocale,
                        isActive: updated.isActive,
                        imageUrl: updated.imageUrl ?? null,
                        imageAltText: updated.imageAltText ?? null,
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
        const normalized = (domains ?? [])
            .map((d) => ({
            domain: this.normalizeHost(d.domain),
            isPrimary: !!d.isPrimary,
        }))
            .filter((d) => !!d.domain);
        const primaryCount = normalized.filter((d) => d.isPrimary).length;
        if (primaryCount > 1) {
            throw new common_1.BadRequestException('Only one primary domain is allowed per store.');
        }
        const seen = new Set();
        const deduped = [];
        for (const d of normalized) {
            if (!seen.has(d.domain)) {
                seen.add(d.domain);
                deduped.push(d);
            }
            else {
                const idx = deduped.findIndex((x) => x.domain === d.domain);
                if (idx >= 0 && d.isPrimary)
                    deduped[idx].isPrimary = true;
            }
        }
        if (deduped.length === 0) {
            await this.db
                .delete(schema_1.storeDomains)
                .where((0, drizzle_orm_1.eq)(schema_1.storeDomains.storeId, storeId))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            return [];
        }
        if (!deduped.some((d) => d.isPrimary)) {
            deduped[0].isPrimary = true;
        }
        const domainList = deduped.map((d) => d.domain);
        const conflicts = await this.db
            .select({
            domain: schema_1.storeDomains.domain,
            storeId: schema_1.storeDomains.storeId,
        })
            .from(schema_1.storeDomains)
            .innerJoin(schema_1.stores, (0, drizzle_orm_1.eq)(schema_1.stores.id, schema_1.storeDomains.storeId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.storeDomains.domain, domainList), (0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.ne)(schema_1.storeDomains.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.storeDomains.deletedAt)))
            .execute();
        if (conflicts.length > 0) {
            const conflictList = conflicts
                .map((d) => `${d.domain} (store ID: ${d.storeId})`)
                .join(', ');
            throw new common_1.BadRequestException(`The following domains are already in use by other stores: ${conflictList}`);
        }
        const inserted = await this.db.transaction(async (tx) => {
            await tx
                .delete(schema_1.storeDomains)
                .where((0, drizzle_orm_1.eq)(schema_1.storeDomains.storeId, storeId))
                .execute();
            return tx
                .insert(schema_1.storeDomains)
                .values(deduped.map((d) => ({
                storeId,
                domain: d.domain,
                isPrimary: d.isPrimary,
            })))
                .returning()
                .execute();
        });
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
                    domains: deduped,
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
    normalizeHost(hostRaw) {
        const host = (hostRaw || '').toLowerCase().trim();
        const noPort = host.split(':')[0];
        const noDot = noPort.endsWith('.') ? noPort.slice(0, -1) : noPort;
        return noDot.startsWith('www.') ? noDot.slice(4) : noDot;
    }
    async resolveStoreByHost(hostRaw) {
        const host = this.normalizeHost(hostRaw);
        if (!host)
            return null;
        const cacheKey = ['store-domain', host];
        return this.cache.getOrSetVersioned('global', cacheKey, async () => {
            if (process.env.NODE_ENV !== 'production' &&
                (host === 'localhost' || host.endsWith('.localhost'))) {
                const [row] = await this.db
                    .select({
                    storeId: schema_1.stores.id,
                    companyId: schema_1.stores.companyId,
                    domain: (0, drizzle_orm_1.sql) `'localhost'`,
                    isPrimary: (0, drizzle_orm_1.sql) `true`,
                })
                    .from(schema_1.stores)
                    .where((0, drizzle_orm_1.eq)(schema_1.stores.isActive, true))
                    .limit(1)
                    .execute();
                return row ?? null;
            }
            const [row] = await this.db
                .select({
                storeId: schema_1.storeDomains.storeId,
                domain: schema_1.storeDomains.domain,
                isPrimary: schema_1.storeDomains.isPrimary,
                companyId: schema_1.stores.companyId,
            })
                .from(schema_1.storeDomains)
                .innerJoin(schema_1.stores, (0, drizzle_orm_1.eq)(schema_1.stores.id, schema_1.storeDomains.storeId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storeDomains.domain, host), (0, drizzle_orm_1.isNull)(schema_1.storeDomains.deletedAt), (0, drizzle_orm_1.eq)(schema_1.stores.isActive, true)))
                .execute();
            if (process.env.NODE_ENV === 'production' &&
                row.domain === 'localhost') {
                throw new common_1.BadRequestException('localhost is not allowed in production');
            }
            return row ?? null;
        }, { ttlSeconds: 60 });
    }
};
exports.StoresService = StoresService;
exports.StoresService = StoresService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        aws_service_1.AwsService])
], StoresService);
//# sourceMappingURL=stores.service.js.map