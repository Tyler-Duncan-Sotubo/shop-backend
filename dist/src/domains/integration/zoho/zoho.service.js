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
exports.ZohoService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const types_1 = require("./types/types");
const zoho_oauth_1 = require("./zoho.oauth");
const axios_1 = require("axios");
function isValidZohoRegion(v) {
    if (!v)
        return true;
    return types_1.AllowedZohoRegions.includes(v);
}
let ZohoService = class ZohoService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async upsertForStore(companyId, storeId, dto, user, ip) {
        if (!dto.refreshToken?.trim()) {
            throw new common_1.BadRequestException('refreshToken is required');
        }
        if (!isValidZohoRegion(dto.region)) {
            throw new common_1.BadRequestException(`Invalid region. Allowed: ${types_1.AllowedZohoRegions.join(', ')}`);
        }
        const now = new Date();
        const [row] = await this.db
            .insert(schema_1.zohoConnections)
            .values({
            companyId,
            storeId,
            refreshToken: dto.refreshToken,
            region: dto.region ?? 'com',
            zohoOrganizationId: dto.zohoOrganizationId ?? null,
            zohoOrganizationName: dto.zohoOrganizationName ?? null,
            accessToken: dto.accessToken ?? null,
            accessTokenExpiresAt: dto.accessTokenExpiresAt ?? null,
            isActive: dto.isActive ?? true,
            lastError: null,
            disconnectedAt: null,
            updatedAt: now,
        })
            .onConflictDoUpdate({
            target: [schema_1.zohoConnections.storeId],
            set: {
                companyId,
                refreshToken: dto.refreshToken,
                region: dto.region ?? 'com',
                zohoOrganizationId: dto.zohoOrganizationId ?? null,
                zohoOrganizationName: dto.zohoOrganizationName ?? null,
                accessToken: dto.accessToken ?? null,
                accessTokenExpiresAt: dto.accessTokenExpiresAt ?? null,
                isActive: dto.isActive ?? true,
                lastError: null,
                disconnectedAt: null,
                updatedAt: now,
            },
        })
            .returning()
            .execute();
        await this.auditService.logAction({
            action: 'upsert',
            entity: 'zoho_connections',
            entityId: row.id,
            userId: user.id,
            details: 'Upserted Zoho connection',
            ipAddress: ip,
            changes: {
                companyId,
                storeId,
                region: row.region,
                zohoOrganizationId: row.zohoOrganizationId,
                isActive: row.isActive,
            },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return row;
    }
    async getValidAccessToken(companyId, storeId) {
        const connection = await this.findForStore(companyId, storeId);
        if (!connection) {
            throw new Error('Zoho not connected');
        }
        const now = new Date();
        const expiresAt = connection.accessTokenExpiresAt
            ? new Date(connection.accessTokenExpiresAt)
            : null;
        const hasValidExpiry = expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime());
        if (connection.accessToken && hasValidExpiry && expiresAt > now) {
            return connection.accessToken;
        }
        const refreshed = await this.refreshAccessToken({
            region: connection.region,
            refreshToken: connection.refreshToken,
        });
        const refreshedExpiresAt = new Date(refreshed.expiresAt);
        if (Number.isNaN(refreshedExpiresAt.getTime())) {
            throw new Error('Invalid expiry from Zoho');
        }
        await this.updateForStore(companyId, storeId, {
            accessToken: refreshed.accessToken,
            accessTokenExpiresAt: refreshedExpiresAt,
        });
        return refreshed.accessToken;
    }
    async findAllForStore(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['zoho', 'store', storeId, 'all'], async () => {
            return this.db
                .select()
                .from(schema_1.zohoConnections)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
                .orderBy((0, drizzle_orm_1.asc)(schema_1.zohoConnections.connectedAt))
                .execute();
        });
    }
    async findForStore(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['zoho', 'store', storeId, 'one'], async () => {
            const rows = await this.db
                .select()
                .from(schema_1.zohoConnections)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
                .execute();
            if (rows.length === 0) {
                throw new common_1.NotFoundException('Zoho connection not found');
            }
            return rows[0];
        });
    }
    async updateForStore(companyId, storeId, dto, user, ip) {
        if (!isValidZohoRegion(dto.region)) {
            throw new common_1.BadRequestException(`Invalid region. Allowed: ${types_1.AllowedZohoRegions.join(', ')}`);
        }
        const [updated] = await this.db
            .update(schema_1.zohoConnections)
            .set({
            ...(dto.refreshToken !== undefined
                ? { refreshToken: dto.refreshToken }
                : {}),
            ...(dto.region !== undefined ? { region: dto.region } : {}),
            ...(dto.zohoOrganizationId !== undefined
                ? { zohoOrganizationId: dto.zohoOrganizationId }
                : {}),
            ...(dto.zohoOrganizationName !== undefined
                ? { zohoOrganizationName: dto.zohoOrganizationName }
                : {}),
            ...(dto.accessToken !== undefined
                ? { accessToken: dto.accessToken }
                : {}),
            ...(dto.accessTokenExpiresAt !== undefined
                ? { accessTokenExpiresAt: dto.accessTokenExpiresAt }
                : {}),
            ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
            ...(dto.lastError !== undefined ? { lastError: dto.lastError } : {}),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Zoho connection not found');
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'zoho_connections',
                entityId: updated.id,
                userId: user.id,
                details: 'Updated Zoho connection',
                ipAddress: ip,
                changes: {
                    companyId,
                    storeId,
                    region: updated.region,
                    zohoOrganizationId: updated.zohoOrganizationId,
                    isActive: updated.isActive,
                },
            });
        }
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async setEnabled(companyId, storeId, enabled, user, ip) {
        const now = new Date();
        const [updated] = await this.db
            .update(schema_1.zohoConnections)
            .set({
            isActive: enabled,
            ...(enabled ? { disconnectedAt: null } : { disconnectedAt: now }),
            updatedAt: now,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Zoho connection not found');
        await this.auditService.logAction({
            action: 'update',
            entity: 'zoho_connections',
            entityId: updated.id,
            userId: user.id,
            details: enabled ? 'Enabled Zoho connection' : 'Disabled Zoho connection',
            ipAddress: ip,
            changes: { companyId, storeId, enabled },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return updated;
    }
    async remove(companyId, storeId, user, ip) {
        const [deleted] = await this.db
            .delete(schema_1.zohoConnections)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Zoho connection not found');
        await this.auditService.logAction({
            action: 'delete',
            entity: 'zoho_connections',
            entityId: deleted.id,
            userId: user.id,
            details: 'Deleted Zoho connection',
            ipAddress: ip,
            changes: { companyId, storeId },
        });
        await this.cache.bumpCompanyVersion(companyId);
        return deleted;
    }
    async setLastError(companyId, storeId, error) {
        await this.db
            .update(schema_1.zohoConnections)
            .set({ lastError: error, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
    }
    async touchLastSynced(companyId, storeId) {
        await this.db
            .update(schema_1.zohoConnections)
            .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.zohoConnections.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.zohoConnections.storeId, storeId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
    }
    async refreshAccessToken(params) {
        const clientId = process.env.ZOHO_CLIENT_ID;
        const clientSecret = process.env.ZOHO_CLIENT_SECRET;
        const tokenUrl = `${(0, zoho_oauth_1.getZohoAccountsBase)(params.region)}/oauth/v2/token`;
        const res = await axios_1.default.post(tokenUrl, null, {
            params: {
                grant_type: 'refresh_token',
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: params.refreshToken,
            },
        });
        const { access_token: accessToken, expires_in: expiresIn } = res.data;
        return {
            accessToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
    }
};
exports.ZohoService = ZohoService;
exports.ZohoService = ZohoService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], ZohoService);
//# sourceMappingURL=zoho.service.js.map