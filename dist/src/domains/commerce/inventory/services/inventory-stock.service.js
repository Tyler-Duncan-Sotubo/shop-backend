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
exports.InventoryStockService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const inventory_locations_service_1 = require("./inventory-locations.service");
const inventory_ledger_service_1 = require("./inventory-ledger.service");
let InventoryStockService = class InventoryStockService {
    constructor(db, cache, auditService, locationsService, ledger) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.locationsService = locationsService;
        this.ledger = ledger;
    }
    async adjustInventoryInTx(tx, companyId, productVariantId, locationId, deltaAvailable, deltaReserved = 0) {
        const loc = await tx.query.inventoryLocations.findFirst({
            columns: { id: true, storeId: true, isActive: true },
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, locationId)),
        });
        if (!loc) {
            throw new common_1.BadRequestException('Inventory location not found for this company.');
        }
        if (loc.isActive === false) {
            throw new common_1.BadRequestException('Inventory location is inactive.');
        }
        const storeId = loc.storeId;
        const existing = await tx.query.inventoryItems.findFirst({
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.productVariantId, productVariantId), eq(f.locationId, locationId)),
        });
        if (!existing) {
            const newAvailable = deltaAvailable;
            const newReserved = deltaReserved;
            if (newAvailable < 0 || newReserved < 0) {
                throw new common_1.BadRequestException('Insufficient stock for this operation at the specified location.');
            }
            await tx
                .insert(schema_1.inventoryItems)
                .values({
                companyId,
                storeId,
                productVariantId,
                locationId,
                available: newAvailable,
                reserved: newReserved,
                safetyStock: 0,
            })
                .execute();
            return;
        }
        if (existing.storeId !== storeId) {
            throw new common_1.BadRequestException('Inventory item store mismatch for the specified location.');
        }
        const newAvailable = existing.available + deltaAvailable;
        const newReserved = existing.reserved + deltaReserved;
        if (newAvailable < 0 || newReserved < 0) {
            throw new common_1.BadRequestException('Insufficient stock for this operation at the specified location.');
        }
        await tx
            .update(schema_1.inventoryItems)
            .set({
            available: newAvailable,
            reserved: newReserved,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, existing.id))
            .execute();
    }
    async setInventoryLevel(companyId, productVariantId, quantity, safetyStock = 0, user, ip, opts) {
        const tx = opts?.tx ?? this.db;
        if (quantity < 0)
            throw new common_1.BadRequestException('Quantity cannot be negative');
        const variant = await tx.query.productVariants.findFirst({
            columns: { id: true, storeId: true },
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, productVariantId)),
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        const locationId = await this.getDefaultWarehouseLocationId(companyId, variant.storeId);
        if (!locationId) {
            return { items: [], locationId: null };
        }
        const existing = await tx.query.inventoryItems.findFirst({
            where: (fields, { and, eq }) => and(eq(fields.companyId, companyId), eq(fields.productVariantId, productVariantId), eq(fields.locationId, locationId)),
        });
        let before = null;
        let after = null;
        if (!existing) {
            const [inserted] = await tx
                .insert(schema_1.inventoryItems)
                .values({
                companyId,
                storeId: variant.storeId,
                productVariantId,
                locationId,
                available: quantity,
                reserved: 0,
                safetyStock,
            })
                .returning()
                .execute();
            after = inserted;
        }
        else {
            before = existing;
            const [updated] = await tx
                .update(schema_1.inventoryItems)
                .set({
                storeId: variant.storeId,
                available: quantity,
                safetyStock,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.inventoryItems.id, existing.id))
                .returning()
                .execute();
            after = updated;
        }
        if (!opts?.skipCacheBump)
            await this.cache.bumpCompanyVersion(companyId);
        if (!opts?.skipAudit && user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'inventory_item',
                entityId: after.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Set inventory level at default store warehouse',
                changes: { companyId, productVariantId, locationId, before, after },
            });
        }
        return after;
    }
    async adjustInventoryLevel(companyId, productVariantId, locationId, delta, user, ip) {
        await this.locationsService.findLocationByIdOrThrow(companyId, locationId);
        const result = await this.db.transaction(async (tx) => {
            await this.adjustInventoryInTx(tx, companyId, productVariantId, locationId, delta);
            const updated = await tx.query.inventoryItems.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, productVariantId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId)),
            });
            return updated;
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip && result) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'inventory_item',
                entityId: result.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Adjusted inventory level at location',
                changes: {
                    companyId,
                    productVariantId,
                    locationId,
                    delta,
                },
            });
        }
        return result;
    }
    async getDefaultWarehouseLocationId(companyId, storeId) {
        const row = await this.db.query.inventoryLocations.findFirst({
            columns: { id: true },
            where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.storeId, storeId), eq(f.type, 'warehouse'), eq(f.isDefault, true), eq(f.isActive, true)),
        });
        return row?.id ?? null;
    }
    async getInventoryOverview(companyId, query) {
        const { search, status, storeId, limit = 50, offset = 0 } = query;
        if (!storeId)
            throw new common_1.BadRequestException('storeId is required');
        const locationId = query.locationId ??
            (await this.getDefaultWarehouseLocationId(companyId, storeId));
        if (!locationId)
            return [];
        const cacheKey = [
            'inventory',
            'overview',
            'store',
            storeId,
            'location',
            locationId,
            'status',
            status ?? 'any',
            'search',
            (search ?? '').trim() || 'none',
            'limit',
            String(limit),
            'offset',
            String(offset),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const location = await this.db.query.inventoryLocations.findFirst({
                columns: { id: true },
                where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.storeId, storeId), eq(f.id, locationId), eq(f.isActive, true)),
            });
            if (!location) {
                return [];
            }
            const whereClauses = [
                (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId),
                (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, locationId),
                (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId),
            ];
            if (status)
                whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.status, status));
            if (search && search.trim()) {
                const q = `%${search.trim()}%`;
                whereClauses.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.products.name, q), (0, drizzle_orm_1.ilike)(schema_1.productVariants.title, q), (0, drizzle_orm_1.ilike)(schema_1.productVariants.sku, q)));
            }
            const rows = await this.db
                .select({
                locationId: schema_1.inventoryLocations.id,
                locationName: schema_1.inventoryLocations.name,
                locationType: schema_1.inventoryLocations.type,
                productId: schema_1.products.id,
                productName: schema_1.products.name,
                productStatus: schema_1.products.status,
                variantId: schema_1.productVariants.id,
                variantTitle: schema_1.productVariants.title,
                sku: schema_1.productVariants.sku,
                isVariantActive: schema_1.productVariants.isActive,
                available: schema_1.inventoryItems.available,
                reserved: schema_1.inventoryItems.reserved,
                safetyStock: schema_1.inventoryItems.safetyStock,
                updatedAt: schema_1.inventoryItems.updatedAt,
            })
                .from(schema_1.inventoryItems)
                .innerJoin(schema_1.inventoryLocations, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.id, schema_1.inventoryItems.locationId)))
                .innerJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryItems.productVariantId)))
                .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.storeId, storeId), ...(status ? [(0, drizzle_orm_1.eq)(schema_1.products.status, status)] : []), ...(search?.trim()
                ? [
                    (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.products.name, `%${search.trim()}%`), (0, drizzle_orm_1.ilike)(schema_1.productVariants.title, `%${search.trim()}%`), (0, drizzle_orm_1.ilike)(schema_1.productVariants.sku, `%${search.trim()}%`)),
                ]
                : [])))
                .orderBy(schema_1.products.name, schema_1.productVariants.title)
                .limit(limit)
                .offset(offset)
                .execute();
            return rows.map((r) => {
                const available = Number(r.available ?? 0);
                const reserved = Number(r.reserved ?? 0);
                const safetyStock = Number(r.safetyStock ?? 0);
                return {
                    ...r,
                    inStock: available,
                    committed: reserved,
                    onHand: available + reserved,
                    lowStock: available <= safetyStock,
                };
            });
        });
    }
    async reserveInTx(tx, companyId, orderId, locationId, productVariantId, qty) {
        if (!Number.isFinite(qty) || qty <= 0)
            return;
        const existing = await tx
            .select({ quantity: schema_1.inventoryReservations.quantity })
            .from(schema_1.inventoryReservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.productVariantId, productVariantId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.status, 'reserved')))
            .limit(1)
            .execute();
        const alreadyReserved = Number(existing?.[0]?.quantity ?? 0);
        const delta = qty - alreadyReserved;
        if (delta <= 0)
            return;
        const updated = await tx
            .update(schema_1.inventoryItems)
            .set({
            reserved: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reserved} + ${delta}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, productVariantId), (0, drizzle_orm_1.sql) `(${schema_1.inventoryItems.available} - ${schema_1.inventoryItems.reserved} - ${schema_1.inventoryItems.safetyStock}) >= ${delta}`))
            .returning({ id: schema_1.inventoryItems.id })
            .execute();
        if (updated.length === 0) {
            throw new common_1.BadRequestException('Insufficient sellable stock to reserve.');
        }
        await this.ledger.logInTx(tx, {
            companyId,
            locationId,
            productVariantId,
            type: 'reserve',
            deltaAvailable: 0,
            deltaReserved: +delta,
            ref: { refType: 'order', refId: orderId },
            note: 'Reserved stock for order',
            meta: { requestedQty: qty, alreadyReserved, delta },
        });
        await tx
            .insert(schema_1.inventoryReservations)
            .values({
            companyId,
            orderId,
            locationId,
            productVariantId,
            quantity: qty,
            status: 'reserved',
            expiresAt: null,
        })
            .onConflictDoUpdate({
            target: [
                schema_1.inventoryReservations.companyId,
                schema_1.inventoryReservations.orderId,
                schema_1.inventoryReservations.locationId,
                schema_1.inventoryReservations.productVariantId,
            ],
            set: {
                quantity: qty,
                status: 'reserved',
            },
        })
            .execute();
    }
    async reserveForOrderInTx(tx, companyId, orderId, locationId, productVariantId, qty) {
        if (!Number.isFinite(qty) || qty <= 0)
            return;
        const existing = await tx
            .select({ quantity: schema_1.inventoryReservations.quantity })
            .from(schema_1.inventoryReservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.productVariantId, productVariantId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.status, 'reserved')))
            .limit(1)
            .execute();
        const already = Number(existing?.[0]?.quantity ?? 0);
        const delta = qty - already;
        if (delta <= 0)
            return;
        const updated = await tx
            .update(schema_1.inventoryItems)
            .set({
            reserved: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reserved} + ${delta}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, productVariantId), (0, drizzle_orm_1.sql) `(${schema_1.inventoryItems.available} - ${schema_1.inventoryItems.reserved} - ${schema_1.inventoryItems.safetyStock}) >= ${delta}`))
            .returning({ id: schema_1.inventoryItems.id })
            .execute();
        if (updated.length === 0) {
            throw new common_1.BadRequestException('Insufficient sellable stock to reserve.');
        }
        await this.ledger.logInTx(tx, {
            companyId,
            locationId,
            productVariantId,
            type: 'reserve',
            deltaReserved: +delta,
            ref: { refType: 'order', refId: orderId },
            note: 'Reserved stock for order (reserveForOrderInTx)',
            meta: { requestedQty: qty, alreadyReserved: already, delta },
        });
        await tx
            .insert(schema_1.inventoryReservations)
            .values({
            companyId,
            orderId,
            locationId,
            productVariantId,
            quantity: qty,
            status: 'reserved',
            expiresAt: null,
        })
            .onConflictDoUpdate({
            target: [
                schema_1.inventoryReservations.companyId,
                schema_1.inventoryReservations.orderId,
                schema_1.inventoryReservations.locationId,
                schema_1.inventoryReservations.productVariantId,
            ],
            set: {
                quantity: qty,
                status: 'reserved',
            },
        })
            .execute();
    }
    async releaseOrderReservationsInTx(tx, companyId, orderId) {
        const rows = await tx
            .select()
            .from(schema_1.inventoryReservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.status, 'reserved')))
            .execute();
        for (const r of rows) {
            const qty = Number(r.quantity ?? 0);
            if (qty <= 0)
                continue;
            await this.releaseReservationInTx(tx, companyId, r.locationId, r.productVariantId, qty, { refType: 'order', refId: orderId }, { reservationId: r.id });
            await tx
                .update(schema_1.inventoryReservations)
                .set({ status: 'released' })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.id, r.id)))
                .execute();
        }
    }
    async releaseReservationInTx(tx, companyId, locationId, productVariantId, qty, ref, meta) {
        if (!Number.isFinite(qty) || qty <= 0)
            return;
        const updated = await tx
            .update(schema_1.inventoryItems)
            .set({
            reserved: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reserved} - ${qty}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, productVariantId), (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reserved} >= ${qty}`))
            .returning({ id: schema_1.inventoryItems.id })
            .execute();
        if (updated.length === 0) {
            throw new common_1.BadRequestException('Cannot release reservation (reserved too low).');
        }
        await this.ledger.logInTx(tx, {
            companyId,
            locationId,
            productVariantId,
            type: 'release',
            deltaReserved: -qty,
            ref: ref ?? null,
            note: 'Released reserved stock',
            meta,
        });
    }
    async fulfillOrderReservationsInTx(tx, companyId, orderId) {
        const rows = await tx
            .select()
            .from(schema_1.inventoryReservations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.status, 'reserved')))
            .execute();
        for (const r of rows) {
            const qty = Number(r.quantity ?? 0);
            if (qty <= 0)
                continue;
            await this.fulfillFromReservationInTx(tx, companyId, r.locationId, r.productVariantId, qty, { refType: 'order', refId: orderId }, { reservationId: r.id });
            await tx
                .update(schema_1.inventoryReservations)
                .set({ status: 'fulfilled' })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryReservations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryReservations.id, r.id)))
                .execute();
        }
    }
    async fulfillFromReservationInTx(tx, companyId, locationId, productVariantId, qty, ref, meta) {
        if (!Number.isFinite(qty) || qty <= 0)
            return;
        const updated = await tx
            .update(schema_1.inventoryItems)
            .set({
            available: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.available} - ${qty}`,
            reserved: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reserved} - ${qty}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, productVariantId), (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.reserved} >= ${qty}`, (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.available} >= ${qty}`))
            .returning({ id: schema_1.inventoryItems.id })
            .execute();
        if (updated.length === 0) {
            throw new common_1.BadRequestException('Cannot fulfill (insufficient reserved/available).');
        }
        await this.ledger.logInTx(tx, {
            companyId,
            locationId,
            productVariantId,
            type: 'fulfill',
            deltaAvailable: -qty,
            deltaReserved: -qty,
            ref: ref ?? null,
            note: 'Fulfilled reserved stock',
            meta,
        });
    }
    async deductAvailableInTx(tx, companyId, locationId, variantId, qty, ref, meta) {
        if (!Number.isFinite(qty) || qty <= 0)
            return;
        const rows = await tx
            .update(schema_1.inventoryItems)
            .set({
            available: (0, drizzle_orm_1.sql) `${schema_1.inventoryItems.available} - ${qty}`,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, locationId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, variantId), (0, drizzle_orm_1.sql) `(${schema_1.inventoryItems.available} - ${schema_1.inventoryItems.reserved} - ${schema_1.inventoryItems.safetyStock}) >= ${qty}`))
            .returning({ id: schema_1.inventoryItems.id })
            .execute();
        if (rows.length === 0) {
            throw new common_1.BadRequestException('Insufficient sellable stock to deduct.');
        }
        await this.ledger.logInTx(tx, {
            companyId,
            locationId,
            productVariantId: variantId,
            type: 'pos_deduct',
            deltaAvailable: -qty,
            deltaReserved: 0,
            ref: ref ?? null,
            note: 'POS deducted stock',
            meta,
        });
    }
};
exports.InventoryStockService = InventoryStockService;
exports.InventoryStockService = InventoryStockService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        inventory_locations_service_1.InventoryLocationsService,
        inventory_ledger_service_1.InventoryLedgerService])
], InventoryStockService);
//# sourceMappingURL=inventory-stock.service.js.map