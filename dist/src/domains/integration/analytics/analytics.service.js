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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const analytics_providers_1 = require("./analytics.providers");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let AnalyticsService = class AnalyticsService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async upsertForCompany(companyId, storeId, dto, user, ip) {
        if (!(0, analytics_providers_1.isValidProvider)(dto.provider)) {
            throw new common_1.BadRequestException(`Invalid provider. Allowed: ${analytics_providers_1.AnalyticsProviders.join(', ')}`);
        }
        const [row] = await this.db
            .insert(schema_1.analyticsIntegrations)
            .values({
            companyId,
            storeId,
            provider: dto.provider,
            publicConfig: dto.publicConfig ?? {},
            privateConfig: dto.privateConfig ?? {},
            enabled: dto.enabled ?? true,
            requiresConsent: dto.requiresConsent ?? true,
            updatedAt: new Date(),
        })
            .onConflictDoUpdate({
            target: [
                schema_1.analyticsIntegrations.companyId,
                schema_1.analyticsIntegrations.storeId,
                schema_1.analyticsIntegrations.provider,
            ],
            set: {
                publicConfig: dto.publicConfig ?? {},
                privateConfig: dto.privateConfig ?? {},
                enabled: dto.enabled ?? true,
                requiresConsent: dto.requiresConsent ?? true,
                updatedAt: new Date(),
            },
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'upsert',
            entity: 'analytics_integrations',
            entityId: row.id,
            userId: user.id,
            details: 'Upserted analytics integration',
            ipAddress: ip,
            changes: {
                companyId,
                provider: dto.provider,
                enabled: row.enabled,
                requiresConsent: row.requiresConsent,
                publicConfig: row.publicConfig,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return row;
    }
    async findAllForStore(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['analytics', 'store', storeId, 'all'], async () => {
            return this.db
                .select()
                .from(schema_1.analyticsIntegrations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.storeId, storeId)))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.analyticsIntegrations.provider))
                .execute();
        });
    }
    async findByProvider(companyId, storeId, provider) {
        if (!(0, analytics_providers_1.isValidProvider)(provider)) {
            throw new common_1.BadRequestException(`Invalid provider. Allowed: ${analytics_providers_1.AnalyticsProviders.join(', ')}`);
        }
        return this.cache.getOrSetVersioned(companyId, ['analytics', 'provider', storeId, provider], async () => {
            const rows = await this.db
                .select()
                .from(schema_1.analyticsIntegrations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.provider, provider)))
                .execute();
            if (rows.length === 0) {
                throw new common_1.NotFoundException('Analytics integration not found');
            }
            return rows[0];
        });
    }
    async updateByProvider(companyId, storeId, provider, dto, user, ip) {
        if (!(0, analytics_providers_1.isValidProvider)(provider)) {
            throw new common_1.BadRequestException(`Invalid provider. Allowed: ${analytics_providers_1.AnalyticsProviders.join(', ')}`);
        }
        const [updated] = await this.db
            .update(schema_1.analyticsIntegrations)
            .set({
            ...(dto.publicConfig !== undefined
                ? { publicConfig: dto.publicConfig }
                : {}),
            ...(dto.privateConfig !== undefined
                ? { privateConfig: dto.privateConfig }
                : {}),
            ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
            ...(dto.requiresConsent !== undefined
                ? { requiresConsent: dto.requiresConsent }
                : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.provider, provider), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.storeId, storeId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Analytics integration not found');
        }
        await this.auditService.logAction({
            action: 'update',
            entity: 'analytics_integrations',
            entityId: updated.id,
            userId: user.id,
            details: 'Updated analytics integration',
            ipAddress: ip,
            changes: {
                companyId,
                provider,
                enabled: updated.enabled,
                requiresConsent: updated.requiresConsent,
                publicConfig: updated.publicConfig,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async setEnabled(companyId, storeId, provider, enabled, user, ip) {
        if (!(0, analytics_providers_1.isValidProvider)(provider)) {
            throw new common_1.BadRequestException(`Invalid provider. Allowed: ${analytics_providers_1.AnalyticsProviders.join(', ')}`);
        }
        const [updated] = await this.db
            .update(schema_1.analyticsIntegrations)
            .set({ enabled, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.provider, provider), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.storeId, storeId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Analytics integration not found');
        await this.auditService.logAction({
            action: 'update',
            entity: 'analytics_integrations',
            entityId: updated.id,
            userId: user.id,
            details: enabled
                ? 'Enabled analytics integration'
                : 'Disabled analytics integration',
            ipAddress: ip,
            changes: { companyId, provider, enabled },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async remove(companyId, storeId, provider, user, ip) {
        if (!(0, analytics_providers_1.isValidProvider)(provider)) {
            throw new common_1.BadRequestException(`Invalid provider. Allowed: ${analytics_providers_1.AnalyticsProviders.join(', ')}`);
        }
        const [deleted] = await this.db
            .delete(schema_1.analyticsIntegrations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.provider, provider), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.storeId, storeId)))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Analytics integration not found');
        await this.auditService.logAction({
            action: 'delete',
            entity: 'analytics_integrations',
            entityId: deleted.id,
            userId: user.id,
            details: 'Deleted analytics integration',
            ipAddress: ip,
            changes: { companyId, provider },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return deleted;
    }
    async getPublicForStore(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['analytics', 'public', storeId], async () => {
            return this.db
                .select({
                provider: schema_1.analyticsIntegrations.provider,
                publicConfig: schema_1.analyticsIntegrations.publicConfig,
                requiresConsent: schema_1.analyticsIntegrations.requiresConsent,
            })
                .from(schema_1.analyticsIntegrations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.analyticsIntegrations.enabled, true)))
                .execute();
        });
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map