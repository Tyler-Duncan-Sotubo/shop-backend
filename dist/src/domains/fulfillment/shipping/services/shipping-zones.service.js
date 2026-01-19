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
exports.ShippingZonesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
let ShippingZonesService = class ShippingZonesService {
    constructor(db, cache, auditService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
    }
    async listZones(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['shipping', 'zones', 'v1', storeId], async () => {
            return this.db
                .select()
                .from(schema_1.shippingZones)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), storeId
                ? (0, drizzle_orm_1.eq)(schema_1.shippingZones.storeId, storeId)
                : (0, drizzle_orm_1.isNull)(schema_1.shippingZones.storeId)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingZones.priority))
                .execute();
        });
    }
    async createZone(companyId, dto, user, ip) {
        const [zone] = await this.db
            .insert(schema_1.shippingZones)
            .values({
            companyId,
            storeId: dto.storeId,
            name: dto.name,
            isActive: dto.isActive ?? true,
            priority: dto.priority ?? 0,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'shipping_zone',
                entityId: zone.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created shipping zone',
                changes: { companyId, zoneId: zone.id, name: dto.name },
            });
        }
        return zone;
    }
    async updateZone(companyId, zoneId, patch, user, ip) {
        const existing = await this.db.query.shippingZones.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, zoneId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Zone not found');
        const [updated] = await this.db
            .update(schema_1.shippingZones)
            .set({
            name: patch.name ?? existing.name,
            priority: patch.priority ?? existing.priority,
            isActive: patch.isActive ?? existing.isActive,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, zoneId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'shipping_zone',
                entityId: zoneId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated shipping zone',
                changes: { companyId, zoneId, before: existing, after: updated },
            });
        }
        return updated;
    }
    async deleteZone(companyId, zoneId, user, ip) {
        const existing = await this.db.query.shippingZones.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, zoneId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Zone not found');
        await this.db
            .delete(schema_1.shippingZones)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, zoneId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'shipping_zone',
                entityId: zoneId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted shipping zone',
                changes: { companyId, zoneId, name: existing.name },
            });
        }
        return { ok: true };
    }
    async listZoneLocations(companyId, zoneId) {
        return this.cache.getOrSetVersioned(companyId, ['shipping', 'zones', 'locations', 'v1', zoneId], async () => {
            const zone = await this.db.query.shippingZones.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, zoneId)),
            });
            if (!zone)
                throw new common_1.NotFoundException('Zone not found');
            return this.db
                .select({
                id: schema_1.shippingZoneLocations.id,
                countryCode: schema_1.shippingZoneLocations.countryCode,
                regionCode: schema_1.shippingZoneLocations.regionCode,
                area: schema_1.shippingZoneLocations.area,
                zoneName: schema_1.shippingZones.name,
            })
                .from(schema_1.shippingZoneLocations)
                .innerJoin(schema_1.shippingZones, (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, schema_1.shippingZoneLocations.zoneId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.zoneId, zoneId)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingZoneLocations.createdAt))
                .execute();
        });
    }
    async upsertZoneLocation(companyId, dto, user, ip) {
        const zone = await this.db.query.shippingZones.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, dto.zoneId)),
        });
        if (!zone)
            throw new common_1.BadRequestException('Zone does not exist');
        const countryCode = (dto.countryCode ?? 'NG').toUpperCase();
        const regionCode = dto.state ?? null;
        const area = dto.area ?? null;
        const existing = await this.db.query.shippingZoneLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.zoneId, dto.zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.countryCode, countryCode), regionCode === null
                ? (0, drizzle_orm_1.isNull)(schema_1.shippingZoneLocations.regionCode)
                : (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.regionCode, regionCode), area === null
                ? (0, drizzle_orm_1.isNull)(schema_1.shippingZoneLocations.area)
                : (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.area, area)),
        });
        if (existing)
            return existing;
        const [row] = await this.db
            .insert(schema_1.shippingZoneLocations)
            .values({
            companyId,
            zoneId: dto.zoneId,
            countryCode,
            regionCode,
            area,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'shipping_zone_location',
                entityId: row.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Added zone location',
                changes: {
                    companyId,
                    zoneId: dto.zoneId,
                    countryCode,
                    regionCode,
                    area,
                },
            });
        }
        return row;
    }
    async updateZoneLocation(companyId, locationId, dto, user, ip) {
        const existing = await this.db.query.shippingZoneLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.id, locationId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Zone location not found');
        const nextCountryCode = (dto.countryCode ??
            existing.countryCode ??
            'NG').toUpperCase();
        const nextRegionCode = dto.state === undefined ? existing.regionCode : dto.state;
        const nextArea = dto.area === undefined ? existing.area : dto.area;
        const duplicate = await this.db.query.shippingZoneLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.zoneId, existing.zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.countryCode, nextCountryCode), nextRegionCode === null
                ? (0, drizzle_orm_1.isNull)(schema_1.shippingZoneLocations.regionCode)
                : (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.regionCode, nextRegionCode), nextArea === null
                ? (0, drizzle_orm_1.isNull)(schema_1.shippingZoneLocations.area)
                : (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.area, nextArea)),
        });
        if (duplicate && duplicate.id !== locationId) {
            throw new common_1.BadRequestException('Zone location already exists');
        }
        const [updated] = await this.db
            .update(schema_1.shippingZoneLocations)
            .set({
            countryCode: nextCountryCode,
            regionCode: nextRegionCode ?? null,
            area: nextArea ?? null,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.id, locationId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'shipping_zone_location',
                entityId: locationId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated zone location',
                changes: { companyId, locationId, before: existing, after: updated },
            });
        }
        return updated;
    }
    async removeZoneLocation(companyId, locationId, user, ip) {
        const existing = await this.db.query.shippingZoneLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.id, locationId)),
        });
        if (!existing)
            throw new common_1.NotFoundException('Zone location not found');
        await this.db
            .delete(schema_1.shippingZoneLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.id, locationId)))
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'shipping_zone_location',
                entityId: locationId,
                userId: user.id,
                ipAddress: ip,
                details: 'Removed zone location',
                changes: { ...existing },
            });
        }
        return { ok: true };
    }
    async resolveZone(companyId, storeId, countryCode, state, area) {
        const cc = (countryCode || 'NG').toUpperCase();
        const clean = (v) => {
            const s = (v ?? '').trim();
            return s.length ? s : null;
        };
        const region = clean(state);
        const areaValue = clean(area);
        const eqCI = (col, value) => (0, drizzle_orm_1.sql) `lower(${col}) = lower(${value})`;
        const tryMatch = async (regionCode, areaV) => {
            const rows = await this.db
                .select({
                zoneId: schema_1.shippingZoneLocations.zoneId,
                zonePriority: schema_1.shippingZones.priority,
            })
                .from(schema_1.shippingZoneLocations)
                .leftJoin(schema_1.shippingZones, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.id, schema_1.shippingZoneLocations.zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.storeId, storeId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.countryCode, cc), regionCode === null
                ? (0, drizzle_orm_1.isNull)(schema_1.shippingZoneLocations.regionCode)
                : eqCI(schema_1.shippingZoneLocations.regionCode, regionCode), areaV === null
                ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_1.shippingZoneLocations.area), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.area, ''))
                : eqCI(schema_1.shippingZoneLocations.area, areaV), (0, drizzle_orm_1.eq)(schema_1.shippingZones.isActive, true)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingZones.priority))
                .execute();
            if (rows.length === 0)
                return null;
            return this.db.query.shippingZones.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZones.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, rows[0].zoneId)),
            });
        };
        if (region && areaValue) {
            const z = await tryMatch(region, areaValue);
            if (z)
                return z;
        }
        if (region) {
            const z = await tryMatch(region, null);
            if (z)
                return z;
        }
        return tryMatch(null, null);
    }
};
exports.ShippingZonesService = ShippingZonesService;
exports.ShippingZonesService = ShippingZonesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService])
], ShippingZonesService);
//# sourceMappingURL=shipping-zones.service.js.map