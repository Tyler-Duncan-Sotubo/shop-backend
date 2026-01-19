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
exports.SetupService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../infrastructure/cache/cache.service");
const audit_service_1 = require("../audit/audit.service");
const schema_1 = require("../../infrastructure/drizzle/schema");
let SetupService = class SetupService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    normalizeHost(hostRaw) {
        const host = (hostRaw || '').toLowerCase().trim();
        const noPort = host.split(':')[0];
        const noDot = noPort.endsWith('.') ? noPort.slice(0, -1) : noPort;
        return noDot.startsWith('www.') ? noDot.slice(4) : noDot;
    }
    async ensureSlugUniqueForCompany(companyId, slug, tx) {
        const q = (tx ?? this.db)
            .select({ id: schema_1.stores.id })
            .from(schema_1.stores)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.slug, slug)));
        const rows = await q.execute();
        if (rows.length > 0) {
            throw new common_1.BadRequestException(`Slug "${slug}" is already in use for this company.`);
        }
    }
    normalizeAndValidateDomains(domains) {
        const normalized = (domains ?? [])
            .map((d) => ({
            domain: this.normalizeHost(d.domain),
            isPrimary: !!d.isPrimary,
        }))
            .filter((d) => !!d.domain);
        if (normalized.length === 0) {
            throw new common_1.BadRequestException('At least one domain is required.');
        }
        const primaryCount = normalized.filter((d) => d.isPrimary).length;
        if (primaryCount > 1) {
            throw new common_1.BadRequestException('Only one primary domain is allowed.');
        }
        if (!normalized.some((d) => d.isPrimary))
            normalized[0].isPrimary = true;
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
        return deduped;
    }
    async getDefaultBaseId(tx) {
        const [base] = await tx
            .select({ id: schema_1.storefrontBases.id })
            .from(schema_1.storefrontBases)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontBases.key, 'default-v1'), (0, drizzle_orm_1.eq)(schema_1.storefrontBases.isActive, true)))
            .limit(1)
            .execute();
        if (!base?.id) {
            throw new common_1.BadRequestException('No default storefront base found');
        }
        return base.id;
    }
    async getDefaultThemeId(tx) {
        const [theme] = await tx
            .select({ id: schema_1.storefrontThemes.id })
            .from(schema_1.storefrontThemes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.storefrontThemes.key, 'theme-v1'), (0, drizzle_orm_1.eq)(schema_1.storefrontThemes.isActive, true)))
            .limit(1)
            .execute();
        if (!theme?.id) {
            throw new common_1.BadRequestException('No default storefront theme found');
        }
        return theme.id;
    }
    async createStoreWithDomains(companyId, input, user, ip) {
        const dedupedDomains = this.normalizeAndValidateDomains(input.domains);
        const created = await this.db.transaction(async (tx) => {
            const [company] = await tx
                .select({
                id: schema_1.companies.id,
                name: schema_1.companies.name,
                plan: schema_1.companies.plan,
                defaultCurrency: schema_1.companies.defaultCurrency,
                defaultLocale: schema_1.companies.defaultLocale,
                timezone: schema_1.companies.timezone,
                companySize: schema_1.companies.companySize,
                industry: schema_1.companies.industry,
                useCase: schema_1.companies.useCase,
                isActive: schema_1.companies.isActive,
            })
                .from(schema_1.companies)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId), (0, drizzle_orm_1.isNull)(schema_1.companies.deletedAt)))
                .limit(1)
                .execute();
            if (!company)
                throw new common_1.NotFoundException('Company not found');
            if (!company.isActive)
                throw new common_1.BadRequestException('Company is inactive');
            const companyPatch = {};
            if (input.companySize)
                companyPatch.companySize = input.companySize;
            if (input.industry)
                companyPatch.industry = input.industry;
            if (input.useCase)
                companyPatch.useCase = input.useCase;
            let updatedCompany = company;
            if (Object.keys(companyPatch).length > 0) {
                companyPatch.updatedAt = new Date();
                const [c] = await tx
                    .update(schema_1.companies)
                    .set(companyPatch)
                    .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
                    .returning({
                    id: schema_1.companies.id,
                    name: schema_1.companies.name,
                    plan: schema_1.companies.plan,
                    defaultCurrency: schema_1.companies.defaultCurrency,
                    defaultLocale: schema_1.companies.defaultLocale,
                    timezone: schema_1.companies.timezone,
                    companySize: schema_1.companies.companySize,
                    industry: schema_1.companies.industry,
                    useCase: schema_1.companies.useCase,
                    isActive: schema_1.companies.isActive,
                })
                    .execute();
                if (c)
                    updatedCompany = c;
            }
            await this.ensureSlugUniqueForCompany(companyId, input.slug, tx);
            const domainList = dedupedDomains.map((d) => d.domain);
            const conflicts = await tx
                .select({
                domain: schema_1.storeDomains.domain,
                storeId: schema_1.storeDomains.storeId,
            })
                .from(schema_1.storeDomains)
                .innerJoin(schema_1.stores, (0, drizzle_orm_1.eq)(schema_1.stores.id, schema_1.storeDomains.storeId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.storeDomains.domain, domainList), (0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.storeDomains.deletedAt)))
                .execute();
            if (conflicts.length > 0) {
                const conflictList = conflicts
                    .map((c) => `${c.domain} (store ID: ${c.storeId})`)
                    .join(', ');
                throw new common_1.BadRequestException(`The following domains are already in use: ${conflictList}`);
            }
            const [store] = await tx
                .insert(schema_1.stores)
                .values({
                companyId,
                name: input.name,
                slug: input.slug,
                defaultCurrency: input.defaultCurrency ?? updatedCompany.defaultCurrency ?? 'NGN',
                defaultLocale: input.defaultLocale ?? updatedCompany.defaultLocale ?? 'en-NG',
                isActive: input.isActive ?? true,
                supportedCurrencies: input.supportedCurrencies ?? null,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning()
                .execute();
            if (!store)
                throw new common_1.BadRequestException('Failed to create store');
            const [warehouse] = await tx
                .insert(schema_1.inventoryLocations)
                .values({
                companyId,
                storeId: store.id,
                name: `${store.name} Warehouse`,
                code: 'WAREHOUSE-001',
                type: 'warehouse',
                isDefault: true,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
                .returning()
                .execute();
            const insertedDomains = await tx
                .insert(schema_1.storeDomains)
                .values(dedupedDomains.map((d) => ({
                storeId: store.id,
                domain: d.domain,
                isPrimary: d.isPrimary,
            })))
                .returning()
                .execute();
            const baseId = await this.getDefaultBaseId(tx);
            const themeId = await this.getDefaultThemeId(tx);
            const [draftOverride] = await tx
                .insert(schema_1.storefrontOverrides)
                .values({
                companyId,
                storeId: store.id,
                status: 'draft',
                baseId,
                themeId,
                publishedAt: null,
            })
                .returning()
                .execute();
            return {
                company: updatedCompany,
                store,
                warehouse,
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
                details: 'Setup step 1: created store + domains + draft storefront override + default warehouse',
                changes: {
                    companyId,
                    storeId: created.store.id,
                    company: {
                        companySize: created.company?.companySize,
                        industry: created.company?.industry,
                        useCase: created.company?.useCase,
                    },
                    store: { name: created.store.name, slug: created.store.slug },
                    warehouse: {
                        id: created.warehouse?.id,
                        name: created.warehouse?.name,
                        type: created.warehouse?.type,
                        isDefault: created.warehouse?.isDefault,
                    },
                    domains: created.domains.map((d) => ({
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
    async markSetupCompleted(userId) {
        const [user] = await this.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.onboardingCompleted) {
            return { ok: true, alreadyCompleted: true };
        }
        await this.db
            .update(schema_1.users)
            .set({ onboardingCompleted: true })
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId))
            .execute();
        return { ok: true, alreadyCompleted: false };
    }
};
exports.SetupService = SetupService;
exports.SetupService = SetupService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], SetupService);
//# sourceMappingURL=setup.service.js.map