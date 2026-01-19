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
exports.CartTotalsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const audit_service_1 = require("../../../audit/audit.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cart_query_service_1 = require("./cart-query.service");
let CartTotalsService = class CartTotalsService {
    constructor(db, cartQuery, auditService) {
        this.db = db;
        this.cartQuery = cartQuery;
        this.auditService = auditService;
    }
    async recalculateTotals(companyId, storeId, cartId, user, ip, meta) {
        const cart = await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);
        const items = await this.cartQuery.getCartItems(companyId, storeId, cartId);
        let resolvedOriginLocationId = null;
        if (cart.channel === 'pos' && cart.originInventoryLocationId) {
            resolvedOriginLocationId = cart.originInventoryLocationId;
        }
        else {
            resolvedOriginLocationId = await this.resolveOriginInventoryLocationId(companyId, items.map((it) => ({
                variantId: it.variantId ?? null,
                quantity: Number(it.quantity ?? 0),
            })));
        }
        const originChanged = (cart.originInventoryLocationId ?? null) !==
            (resolvedOriginLocationId ?? null);
        if (originChanged) {
            await this.db
                .update(schema_1.carts)
                .set({
                originInventoryLocationId: resolvedOriginLocationId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
                .execute();
        }
        const subtotal = items.reduce((sum, it) => this.addMoney(sum, it.lineTotal), '0');
        const shippingTotal = await this.computeShippingTotal(companyId, cart, items);
        const discountTotal = '0';
        const taxTotal = '0';
        const total = this.addMoney(this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal), this.negMoney(discountTotal));
        const before = {
            subtotal: cart.subtotal,
            discountTotal: cart.discountTotal,
            taxTotal: cart.taxTotal,
            shippingTotal: cart.shippingTotal,
            total: cart.total,
            originInventoryLocationId: cart.originInventoryLocationId ?? null,
        };
        await this.db
            .update(schema_1.carts)
            .set({
            subtotal,
            discountTotal,
            taxTotal,
            shippingTotal,
            total,
            totalsBreakdown: {
                meta: {
                    ...(meta ?? {}),
                    originInventoryLocationId: resolvedOriginLocationId ?? null,
                    originSource: 'inventory_items_single_location',
                },
                computedAt: new Date().toISOString(),
                subtotal,
                shippingTotal,
                discountTotal,
                taxTotal,
            },
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.carts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.carts.id, cartId)))
            .execute();
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'cart',
                entityId: cartId,
                userId: user.id,
                ipAddress: ip,
                details: 'Recalculated cart totals',
                changes: {
                    companyId,
                    cartId,
                    before,
                    after: {
                        subtotal,
                        discountTotal,
                        taxTotal,
                        shippingTotal,
                        total,
                        originInventoryLocationId: resolvedOriginLocationId ?? null,
                    },
                    meta: meta ?? null,
                },
            });
        }
        return this.cartQuery.getCart(companyId, storeId, cartId);
    }
    async computeShippingTotal(companyId, cart, items) {
        if (!cart.selectedShippingRateId)
            return '0';
        const rate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, cart.selectedShippingRateId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true)),
        });
        if (!rate)
            return '0';
        const calc = rate.calc ?? 'flat';
        if (calc === 'flat') {
            return rate.flatAmount ?? '0';
        }
        if (calc === 'weight') {
            const totalWeightGrams = items.reduce((sum, it) => {
                const kg = it.weightKg == null ? 0 : Number(it.weightKg);
                const grams = Number.isFinite(kg) ? Math.round(kg * 1000) : 0;
                return sum + grams * Number(it.quantity ?? 0);
            }, 0);
            const tiers = await this.db
                .select()
                .from(schema_1.shippingRateTiers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRateTiers.rateId, rate.id)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingRateTiers.priority))
                .execute();
            const tier = tiers.find((t) => {
                const min = t.minWeightGrams ?? null;
                const max = t.maxWeightGrams ?? null;
                if (min === null || max === null)
                    return false;
                return totalWeightGrams >= min && totalWeightGrams <= max;
            });
            return tier?.amount ?? '0';
        }
        return '0';
    }
    async assertHasWarehouse(companyId) {
        const row = await this.db.query.inventoryLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)),
        });
        if (!row) {
            throw new common_1.BadRequestException('No warehouse configured. Please create an active warehouse location to fulfill online orders.');
        }
    }
    async getWarehouseLocationId(companyId, storeId) {
        const warehouse = await this.db.query.inventoryLocations.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse')),
        });
        if (!warehouse)
            throw new common_1.BadRequestException('Warehouse location not configured');
        return warehouse.id;
    }
    async resolveOriginInventoryLocationId(companyId, items) {
        const missingVariant = items.some((it) => !it.variantId);
        if (missingVariant)
            return null;
        const requiredQtyByVariant = new Map();
        for (const it of items) {
            const vid = it.variantId;
            requiredQtyByVariant.set(vid, (requiredQtyByVariant.get(vid) ?? 0) + Number(it.quantity ?? 0));
        }
        const variantIds = Array.from(requiredQtyByVariant.keys());
        if (variantIds.length === 0)
            return null;
        await this.assertHasWarehouse(companyId);
        const rows = await this.db
            .select({
            variantId: schema_1.inventoryItems.productVariantId,
            locationId: schema_1.inventoryItems.locationId,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
        })
            .from(schema_1.inventoryItems)
            .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.productVariantId, variantIds), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.type, 'warehouse'), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)))
            .execute();
        if (rows.length === 0)
            return null;
        const sellableByLocation = new Map();
        for (const r of rows) {
            const sellable = Number(r.available ?? 0) -
                Number(r.reserved ?? 0) -
                Number(r.safetyStock ?? 0);
            const locMap = sellableByLocation.get(r.locationId) ?? new Map();
            locMap.set(r.variantId, Math.max(locMap.get(r.variantId) ?? 0, sellable));
            sellableByLocation.set(r.locationId, locMap);
        }
        let bestLocationId = null;
        let bestScore = -Infinity;
        for (const [locationId, locMap] of sellableByLocation.entries()) {
            let ok = true;
            let score = 0;
            for (const [variantId, requiredQty] of requiredQtyByVariant.entries()) {
                const sellable = locMap.get(variantId) ?? 0;
                if (sellable < requiredQty) {
                    ok = false;
                    break;
                }
                score += sellable - requiredQty;
            }
            if (ok && score > bestScore) {
                bestScore = score;
                bestLocationId = locationId;
            }
        }
        return bestLocationId;
    }
    async resolveZone(companyId, countryCode, state, area) {
        const rows = await this.db
            .select({
            zoneId: schema_1.shippingZoneLocations.zoneId,
            priority: schema_1.shippingZones.priority,
        })
            .from(schema_1.shippingZoneLocations)
            .leftJoin(schema_1.shippingZones, (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, schema_1.shippingZoneLocations.zoneId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.countryCode, countryCode), ...(state ? [(0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.regionCode, state)] : []), ...(area ? [(0, drizzle_orm_1.eq)(schema_1.shippingZoneLocations.area, area)] : []), (0, drizzle_orm_1.eq)(schema_1.shippingZones.isActive, true)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.shippingZones.priority))
            .execute();
        if (rows.length > 0) {
            return await this.db.query.shippingZones.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.shippingZones.id, rows[0].zoneId),
            });
        }
        if (area)
            return this.resolveZone(companyId, countryCode, state, undefined);
        if (state)
            return this.resolveZone(companyId, countryCode, undefined, undefined);
        return null;
    }
    async getRateByIdOrThrow(companyId, rateId, zoneId) {
        const rate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.id, rateId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true)),
        });
        if (!rate)
            throw new common_1.BadRequestException('Shipping rate not found for zone');
        return rate;
    }
    async pickBestRate(companyId, zoneId, carrierId) {
        const baseWhere = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.shippingRates.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.zoneId, zoneId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isActive, true));
        if (carrierId) {
            const carrierRate = await this.db.query.shippingRates.findFirst({
                where: (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.eq)(schema_1.shippingRates.carrierId, carrierId)),
            });
            if (carrierRate)
                return carrierRate;
        }
        const defaultRate = await this.db.query.shippingRates.findFirst({
            where: (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.isNull)(schema_1.shippingRates.carrierId), (0, drizzle_orm_1.eq)(schema_1.shippingRates.isDefault, true)),
        });
        if (defaultRate)
            return defaultRate;
        return await this.db.query.shippingRates.findFirst({
            where: baseWhere,
            orderBy: (t, { desc }) => [desc(t.priority)],
        });
    }
    addMoney(a, b) {
        const x = Number(a ?? '0');
        const y = Number(b ?? '0');
        return (x + y).toFixed(2);
    }
    negMoney(a) {
        const x = Number(a ?? '0');
        return (-x).toFixed(2);
    }
    mulMoney(unit, qty) {
        const x = Number(unit ?? '0');
        return (x * Number(qty ?? 0)).toFixed(2);
    }
};
exports.CartTotalsService = CartTotalsService;
exports.CartTotalsService = CartTotalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cart_query_service_1.CartQueryService,
        audit_service_1.AuditService])
], CartTotalsService);
//# sourceMappingURL=cart-totals.service.js.map