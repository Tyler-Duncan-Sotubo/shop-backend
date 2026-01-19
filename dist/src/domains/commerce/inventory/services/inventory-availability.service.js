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
exports.InventoryAvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
let InventoryAvailabilityService = class InventoryAvailabilityService {
    constructor(db) {
        this.db = db;
    }
    async assertAvailable(companyId, locationId, variantId, requiredQty) {
        const [row] = await this.db
            .select({
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, variantId)))
            .execute();
        const sellable = Number(row?.available ?? 0) -
            Number(row?.reserved ?? 0) -
            Number(row?.safetyStock ?? 0);
        if (sellable < requiredQty) {
            throw new common_1.BadRequestException('Insufficient stock for selected item');
        }
    }
    async getWarehouseLocationId(companyId, storeId) {
        const warehouse = await this.db.query.inventoryLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)),
        });
        if (!warehouse) {
            throw new common_1.BadRequestException('Warehouse location not configured');
        }
        return warehouse.id;
    }
    async resolveBestOrigin(companyId, items) {
        if (!items.length)
            return null;
        const variantIds = items.map((i) => i.variantId);
        const rows = await this.db
            .select({
            locationId: schema_1.inventoryItems.locationId,
            variantId: schema_1.inventoryItems.productVariantId,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
        })
            .from(schema_1.inventoryItems)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.productVariantId, variantIds), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)))
            .execute();
        const byLocation = new Map();
        for (const r of rows) {
            const sellable = Number(r.available ?? 0) -
                Number(r.reserved ?? 0) -
                Number(r.safetyStock ?? 0);
            if (!byLocation.has(r.locationId)) {
                byLocation.set(r.locationId, new Map());
            }
            byLocation.get(r.locationId).set(r.variantId, sellable);
        }
        for (const [locationId, stock] of byLocation.entries()) {
            const ok = items.every((i) => (stock.get(i.variantId) ?? 0) >= i.quantity);
            if (ok)
                return locationId;
        }
        return null;
    }
};
exports.InventoryAvailabilityService = InventoryAvailabilityService;
exports.InventoryAvailabilityService = InventoryAvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], InventoryAvailabilityService);
//# sourceMappingURL=inventory-availability.service.js.map