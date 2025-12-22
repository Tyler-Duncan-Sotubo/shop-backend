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
exports.InventoryLocationsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../drizzle/drizzle.module");
const schema_1 = require("../../../../drizzle/schema");
const cache_service_1 = require("../../../../common/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const company_settings_service_1 = require("../../../company-settings/company-settings.service");
let InventoryLocationsService = class InventoryLocationsService {
    constructor(db, cache, auditService, companySettingsService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.companySettingsService = companySettingsService;
    }
    async assertCompanyExists(companyId) {
        const company = await this.db.query.companies.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async findLocationByIdOrThrow(companyId, locationId) {
        const loc = await this.db.query.inventoryLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, locationId)),
        });
        if (!loc) {
            throw new common_1.NotFoundException(`Location not found for company ${companyId}`);
        }
        return loc;
    }
    async assertStoreBelongsToCompany(companyId, storeId) {
        const store = await this.db.query.stores.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.stores.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.stores.id, storeId)),
        });
        return store ?? null;
    }
    async createLocation(companyId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        const store = await this.assertStoreBelongsToCompany(companyId, dto.storeId);
        if (!store)
            throw new common_1.BadRequestException('Store not found for this company');
        if (dto.code) {
            const existing = await this.db.query.inventoryLocations.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, dto.storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.code, dto.code)),
            });
            if (existing) {
                throw new common_1.BadRequestException(`Location code '${dto.code}' already exists for this store`);
            }
        }
        if (dto.type === 'warehouse') {
            await this.checkWarehouseExists(dto.type, companyId, dto.storeId);
        }
        const isDefault = dto.isDefault ?? dto.type === 'warehouse';
        if (isDefault) {
            await this.db
                .update(schema_1.inventoryLocations)
                .set({ isDefault: false, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, dto.storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isDefault, true)))
                .execute();
        }
        const [loc] = await this.db
            .insert(schema_1.inventoryLocations)
            .values({
            companyId,
            storeId: dto.storeId,
            name: dto.name,
            code: dto.code,
            type: dto.type,
            isDefault,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2,
            city: dto.city,
            region: dto.region,
            postalCode: dto.postalCode,
            country: dto.country,
            isActive: dto.isActive ?? true,
        })
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'inventory_location',
                entityId: loc.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created inventory location',
                changes: {
                    companyId,
                    storeId: dto.storeId,
                    locationId: loc.id,
                    name: loc.name,
                    type: loc.type,
                    isDefault: loc.isDefault,
                },
            });
        }
        await this.companySettingsService.markOnboardingStep(companyId, 'location_setup_complete', true);
        return loc;
    }
    async getLocationsByCompany(companyId) {
        return this.cache.getOrSetVersioned(companyId, ['inventory', 'locations'], async () => {
            return this.db
                .select()
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId))
                .execute();
        });
    }
    async getLocationsForStore(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['inventory', 'locations', 'store', storeId], async () => {
            return this.db
                .select({
                id: schema_1.inventoryLocations.id,
                storeId: schema_1.inventoryLocations.storeId,
                name: schema_1.inventoryLocations.name,
                code: schema_1.inventoryLocations.code,
                type: schema_1.inventoryLocations.type,
                addressLine1: schema_1.inventoryLocations.addressLine1,
                addressLine2: schema_1.inventoryLocations.addressLine2,
                city: schema_1.inventoryLocations.city,
                region: schema_1.inventoryLocations.region,
                postalCode: schema_1.inventoryLocations.postalCode,
                country: schema_1.inventoryLocations.country,
                isActive: schema_1.inventoryLocations.isActive,
            })
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId)))
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.inventoryLocations.name} ASC`)
                .execute();
        });
    }
    async updateLocation(companyId, locationId, dto, user, ip) {
        const existing = await this.findLocationByIdOrThrow(companyId, locationId);
        if (dto.type === 'warehouse' && existing.type !== 'warehouse') {
            await this.checkWarehouseExists(dto.type, companyId, dto.storeId || existing.storeId);
        }
        const [updated] = await this.db
            .update(schema_1.inventoryLocations)
            .set({
            name: dto.name ?? existing.name,
            code: dto.code ?? existing.code,
            type: dto.type ?? existing.type,
            addressLine1: dto.addressLine1 ?? existing.addressLine1,
            addressLine2: dto.addressLine2 ?? existing.addressLine2,
            city: dto.city ?? existing.city,
            region: dto.region ?? existing.region,
            postalCode: dto.postalCode ?? existing.postalCode,
            country: dto.country ?? existing.country,
            isActive: dto.isActive === undefined ? existing.isActive : dto.isActive,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, locationId)))
            .returning()
            .execute();
        if (!updated) {
            throw new common_1.NotFoundException('Location not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'inventory_location',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated inventory location',
                changes: {
                    companyId,
                    locationId: updated.id,
                    before: existing,
                    after: updated,
                },
            });
        }
        await this.companySettingsService.markOnboardingStep(companyId, 'location_setup_complete', true);
        return updated;
    }
    async deleteLocation(companyId, locationId, user, ip) {
        const existing = await this.findLocationByIdOrThrow(companyId, locationId);
        const [deleted] = await this.db
            .delete(schema_1.inventoryLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, locationId)))
            .returning()
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException('Location not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'inventory_location',
                entityId: locationId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted inventory location',
                changes: {
                    companyId,
                    locationId,
                    name: existing.name,
                    code: existing.code,
                },
            });
        }
        return { success: true };
    }
    async checkWarehouseExists(type, companyId, storeId) {
        const warehouse = await this.db.query.inventoryLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId)),
        });
        if (warehouse) {
            throw new common_1.BadRequestException(`A warehouse location already exists for this store`);
        }
    }
    async getStoreLocations(companyId, storeId) {
        await this.assertStoreBelongsToCompany(companyId, storeId);
        return this.cache.getOrSetVersioned(companyId, ['inventory', 'store', storeId, 'locations', 'v2'], async () => {
            return this.db
                .select({
                id: schema_1.inventoryLocations.id,
                storeId: schema_1.inventoryLocations.storeId,
                name: schema_1.inventoryLocations.name,
                code: schema_1.inventoryLocations.code,
                type: schema_1.inventoryLocations.type,
                addressLine1: schema_1.inventoryLocations.addressLine1,
                addressLine2: schema_1.inventoryLocations.addressLine2,
                city: schema_1.inventoryLocations.city,
                region: schema_1.inventoryLocations.region,
                postalCode: schema_1.inventoryLocations.postalCode,
                country: schema_1.inventoryLocations.country,
                isActive: schema_1.inventoryLocations.isActive,
                createdAt: schema_1.inventoryLocations.createdAt,
                updatedAt: schema_1.inventoryLocations.updatedAt,
            })
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)))
                .orderBy(schema_1.inventoryLocations.type, schema_1.inventoryLocations.name)
                .execute();
        });
    }
    async getStoreLocationOptions(companyId, storeId) {
        await this.assertStoreBelongsToCompany(companyId, storeId);
        return this.cache.getOrSetVersioned(companyId, ['inventory', 'store', storeId, 'locationOptions'], async () => {
            const rows = await this.db
                .select({
                locationId: schema_1.inventoryLocations.id,
                isPrimary: schema_1.inventoryLocations.isDefault,
                isActive: schema_1.inventoryLocations.isActive,
                name: schema_1.inventoryLocations.name,
                type: schema_1.inventoryLocations.type,
            })
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId)))
                .execute();
            return rows;
        });
    }
    async updateStoreLocations(companyId, storeId, dto, user, ip) {
        await this.assertStoreBelongsToCompany(companyId, storeId);
        const locationIds = dto.locationIds ?? [];
        if (locationIds.length === 0) {
            await this.db
                .delete(schema_1.storeLocations)
                .where((0, drizzle_orm_1.eq)(schema_1.storeLocations.storeId, storeId))
                .execute();
            await this.cache.bumpCompanyVersion(companyId);
            if (user && ip) {
                await this.auditService.logAction({
                    action: 'update',
                    entity: 'store_locations',
                    entityId: storeId,
                    userId: user.id,
                    ipAddress: ip,
                    details: 'Cleared locations assigned to store',
                    changes: {
                        companyId,
                        storeId,
                        locationIds: [],
                    },
                });
            }
            return [];
        }
        const locs = await this.db
            .select({
            id: schema_1.inventoryLocations.id,
            type: schema_1.inventoryLocations.type,
        })
            .from(schema_1.inventoryLocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryLocations.id, locationIds)))
            .execute();
        if (locs.length !== locationIds.length) {
            const validIds = new Set(locs.map((l) => l.id));
            const invalid = locationIds.filter((id) => !validIds.has(id));
            throw new common_1.BadRequestException(`Some locations do not belong to this company: ${invalid.join(', ')}`);
        }
        const warehouses = locs.filter((l) => l.type === 'warehouse');
        if (warehouses.length === 0) {
            throw new common_1.BadRequestException('At least one warehouse location is required for a store.');
        }
        if (warehouses.length > 1) {
            throw new common_1.BadRequestException('More than one warehouse provided. Only one warehouse can be primary for a store.');
        }
        const primaryLocationId = warehouses[0].id;
        await this.db
            .delete(schema_1.storeLocations)
            .where((0, drizzle_orm_1.eq)(schema_1.storeLocations.storeId, storeId))
            .execute();
        const inserted = await this.db
            .insert(schema_1.storeLocations)
            .values(locationIds.map((locationId) => ({
            storeId,
            locationId,
            isActive: true,
            isPrimary: locationId === primaryLocationId,
        })))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'store_locations',
                entityId: storeId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated locations assigned to store (primary forced to warehouse)',
                changes: {
                    companyId,
                    storeId,
                    locationIds,
                    primaryLocationId,
                },
            });
        }
        return inserted;
    }
};
exports.InventoryLocationsService = InventoryLocationsService;
exports.InventoryLocationsService = InventoryLocationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        company_settings_service_1.CompanySettingsService])
], InventoryLocationsService);
//# sourceMappingURL=inventory-locations.service.js.map