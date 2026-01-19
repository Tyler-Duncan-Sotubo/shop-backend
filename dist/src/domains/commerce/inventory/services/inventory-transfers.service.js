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
exports.InventoryTransfersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const inventory_locations_service_1 = require("./inventory-locations.service");
const inventory_stock_service_1 = require("./inventory-stock.service");
let InventoryTransfersService = class InventoryTransfersService {
    constructor(db, cache, auditService, locationsService, stockService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.locationsService = locationsService;
        this.stockService = stockService;
    }
    computeSellable(row) {
        const available = Number(row?.available ?? 0);
        const reserved = Number(row?.reserved ?? 0);
        const safety = Number(row?.safetyStock ?? 0);
        return available - reserved - safety;
    }
    normalizeTransferItems(items) {
        const map = new Map();
        for (const it of items ?? []) {
            const qty = Number(it.quantity ?? 0);
            if (!it.productVariantId)
                continue;
            if (!Number.isFinite(qty) || qty <= 0)
                continue;
            map.set(it.productVariantId, (map.get(it.productVariantId) ?? 0) + qty);
        }
        return Array.from(map.entries()).map(([productVariantId, quantity]) => ({
            productVariantId,
            quantity,
        }));
    }
    async assertEnoughStockForTransfer(companyId, fromLocationId, items) {
        const normalized = this.normalizeTransferItems(items);
        if (!normalized.length) {
            throw new common_1.BadRequestException('Transfer must have at least one item');
        }
        const variantIds = normalized.map((i) => i.productVariantId);
        const rows = await this.db
            .select({
            productVariantId: schema_1.inventoryItems.productVariantId,
            available: schema_1.inventoryItems.available,
            reserved: schema_1.inventoryItems.reserved,
            safetyStock: schema_1.inventoryItems.safetyStock,
        })
            .from(schema_1.inventoryItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.locationId, fromLocationId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.productVariantId, variantIds)))
            .execute();
        const byVariant = new Map(rows.map((r) => [r.productVariantId, r]));
        const errors = [];
        for (const line of normalized) {
            const row = byVariant.get(line.productVariantId);
            const sellable = this.computeSellable(row);
            if (sellable < line.quantity) {
                errors.push({
                    productVariantId: line.productVariantId,
                    requested: line.quantity,
                    sellable,
                });
            }
        }
        if (errors.length) {
            throw new common_1.BadRequestException({
                message: 'Insufficient stock to create transfer',
                errors,
            });
        }
        return normalized;
    }
    async createTransfer(companyId, dto, user, ip) {
        if (dto.fromLocationId === dto.toLocationId) {
            throw new common_1.BadRequestException('fromLocationId and toLocationId must differ');
        }
        const normalizedItems = await this.assertEnoughStockForTransfer(companyId, dto.fromLocationId, dto.items ?? []);
        const result = await this.db.transaction(async (tx) => {
            const [transfer] = await tx
                .insert(schema_1.inventoryTransfers)
                .values({
                companyId,
                fromLocationId: dto.fromLocationId,
                toLocationId: dto.toLocationId,
                reference: dto.reference,
                notes: dto.notes,
                status: 'pending',
            })
                .returning()
                .execute();
            await tx
                .insert(schema_1.inventoryTransferItems)
                .values(normalizedItems.map((item) => ({
                companyId,
                transferId: transfer.id,
                productVariantId: item.productVariantId,
                quantity: item.quantity,
            })))
                .execute();
            const items = await tx.query.inventoryTransferItems.findMany({
                where: (0, drizzle_orm_1.eq)(schema_1.inventoryTransferItems.transferId, transfer.id),
            });
            return { ...transfer, items };
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'inventory_transfer',
                entityId: result.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created inventory transfer',
                changes: {
                    companyId,
                    transferId: result.id,
                    fromLocationId: dto.fromLocationId,
                    toLocationId: dto.toLocationId,
                    items: dto.items,
                },
            });
        }
        return result;
    }
    async listTransfers(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['inventory', 'transfers', 'v4', storeId ?? 'all'], async () => {
            let allowedLocationIds = null;
            if (storeId) {
                const locs = await this.db
                    .select({ id: schema_1.inventoryLocations.id })
                    .from(schema_1.inventoryLocations)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)))
                    .execute();
                const ids = locs.map((l) => l.id);
                if (ids.length === 0)
                    return [];
                allowedLocationIds = ids;
            }
            const transfers = await this.db
                .select()
                .from(schema_1.inventoryTransfers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.companyId, companyId), ...(allowedLocationIds
                ? [
                    (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.inventoryTransfers.fromLocationId, allowedLocationIds), (0, drizzle_orm_1.inArray)(schema_1.inventoryTransfers.toLocationId, allowedLocationIds)),
                ]
                : [])))
                .execute();
            if (transfers.length === 0)
                return [];
            const transferIds = transfers.map((t) => t.id);
            const items = await this.db
                .select({
                id: schema_1.inventoryTransferItems.id,
                transferId: schema_1.inventoryTransferItems.transferId,
                productVariantId: schema_1.inventoryTransferItems.productVariantId,
                quantity: schema_1.inventoryTransferItems.quantity,
                productName: schema_1.products.name,
                variantTitle: schema_1.productVariants.title,
                sku: schema_1.productVariants.sku,
            })
                .from(schema_1.inventoryTransferItems)
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.inventoryTransferItems.productVariantId), (0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId)))
                .leftJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productVariants.productId), (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId)))
                .where((0, drizzle_orm_1.inArray)(schema_1.inventoryTransferItems.transferId, transferIds))
                .execute();
            const locationIds = Array.from(new Set(transfers.flatMap((t) => [t.fromLocationId, t.toLocationId])));
            const locRows = await this.db
                .select({ id: schema_1.inventoryLocations.id, name: schema_1.inventoryLocations.name })
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryLocations.id, locationIds)))
                .execute();
            const locNameById = new Map(locRows.map((l) => [l.id, l.name]));
            const itemsByTransferId = new Map();
            for (const it of items) {
                const arr = itemsByTransferId.get(it.transferId) ?? [];
                arr.push(it);
                itemsByTransferId.set(it.transferId, arr);
            }
            return transfers.map((t) => {
                const its = itemsByTransferId.get(t.id) ?? [];
                const totalQty = its.reduce((sum, x) => sum + Number(x.quantity ?? 0), 0);
                return {
                    ...t,
                    fromLocationName: locNameById.get(t.fromLocationId) ?? null,
                    toLocationName: locNameById.get(t.toLocationId) ?? null,
                    items: its.map((it) => ({
                        id: it.id,
                        productVariantId: it.productVariantId,
                        quantity: it.quantity,
                        productName: it.productName ?? null,
                        variantTitle: it.variantTitle ?? null,
                        sku: it.sku ?? null,
                    })),
                    itemsCount: its.length,
                    totalQuantity: totalQty,
                };
            });
        });
    }
    async getTransferById(companyId, transferId) {
        const transfer = await this.db.query.inventoryTransfers.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.id, transferId)),
        });
        if (!transfer) {
            throw new common_1.NotFoundException('Transfer not found');
        }
        const items = await this.db.query.inventoryTransferItems.findMany({
            where: (0, drizzle_orm_1.eq)(schema_1.inventoryTransferItems.transferId, transfer.id),
        });
        return { ...transfer, items };
    }
    async updateTransferStatus(companyId, transferId, dto, user, ip) {
        const result = await this.db.transaction(async (tx) => {
            const existing = await tx.query.inventoryTransfers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.id, transferId)),
            });
            if (!existing) {
                throw new common_1.NotFoundException('Transfer not found');
            }
            const [updated] = await tx
                .update(schema_1.inventoryTransfers)
                .set({
                status: dto.status,
                notes: dto.notes ?? existing.notes,
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.id, transferId)))
                .returning()
                .execute();
            const isNowCompleted = dto.status === 'completed';
            const wasCompleted = existing.status === 'completed';
            if (isNowCompleted && !wasCompleted) {
                const items = await tx.query.inventoryTransferItems.findMany({
                    where: (0, drizzle_orm_1.eq)(schema_1.inventoryTransferItems.transferId, transferId),
                });
                for (const item of items) {
                    await this.stockService.adjustInventoryInTx(tx, companyId, item.productVariantId, existing.fromLocationId, -item.quantity);
                    await this.stockService.adjustInventoryInTx(tx, companyId, item.productVariantId, existing.toLocationId, item.quantity);
                }
            }
            return { existing, updated };
        });
        const { existing, updated } = result;
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'inventory_transfer',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated inventory transfer status',
                changes: {
                    companyId,
                    transferId: updated.id,
                    beforeStatus: existing.status,
                    afterStatus: updated.status,
                },
            });
        }
        return updated;
    }
    async getStoreTransferHistory(companyId, storeId) {
        return this.cache.getOrSetVersioned(companyId, ['inventory', 'stores', storeId, 'transfers', 'history', 'v2'], async () => {
            const locs = await this.db
                .select({ id: schema_1.inventoryLocations.id })
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.inventoryLocations.isActive, true)))
                .execute();
            const storeLocationIds = locs.map((l) => l.id);
            if (storeLocationIds.length === 0)
                return [];
            const transfers = await this.db
                .select({
                id: schema_1.inventoryTransfers.id,
                fromLocationId: schema_1.inventoryTransfers.fromLocationId,
                toLocationId: schema_1.inventoryTransfers.toLocationId,
            })
                .from(schema_1.inventoryTransfers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryTransfers.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.inArray)(schema_1.inventoryTransfers.fromLocationId, storeLocationIds), (0, drizzle_orm_1.inArray)(schema_1.inventoryTransfers.toLocationId, storeLocationIds))))
                .execute();
            if (transfers.length === 0)
                return [];
            const transferIds = transfers.map((t) => t.id);
            const transferById = new Map(transfers.map((t) => [t.id, t]));
            const allLocationIds = Array.from(new Set(transfers.flatMap((t) => [t.fromLocationId, t.toLocationId])));
            const locRows = await this.db
                .select({
                id: schema_1.inventoryLocations.id,
                name: schema_1.inventoryLocations.name,
            })
                .from(schema_1.inventoryLocations)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryLocations.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryLocations.id, allLocationIds)))
                .execute();
            const locNameById = new Map(locRows.map((l) => [l.id, l.name]));
            const logs = await this.db
                .select({
                id: schema_1.auditLogs.id,
                timestamp: schema_1.auditLogs.timestamp,
                transferId: schema_1.auditLogs.entityId,
                changes: schema_1.auditLogs.changes,
                firstName: schema_1.users.firstName,
                lastName: schema_1.users.lastName,
            })
                .from(schema_1.auditLogs)
                .leftJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.users.id, schema_1.auditLogs.userId))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.auditLogs.entity, 'inventory_transfer'), (0, drizzle_orm_1.inArray)(schema_1.auditLogs.entityId, transferIds)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.auditLogs.timestamp))
                .execute();
            return logs.map((l) => {
                const t = l.transferId ? transferById.get(l.transferId) : undefined;
                return {
                    id: l.id,
                    timestamp: l.timestamp,
                    by: {
                        firstName: l.firstName ?? null,
                        lastName: l.lastName ?? null,
                    },
                    transferId: l.transferId ?? null,
                    fromLocationName: t
                        ? (locNameById.get(t.fromLocationId) ?? null)
                        : null,
                    toLocationName: t
                        ? (locNameById.get(t.toLocationId) ?? null)
                        : null,
                    changes: l.changes ?? null,
                };
            });
        });
    }
};
exports.InventoryTransfersService = InventoryTransfersService;
exports.InventoryTransfersService = InventoryTransfersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        inventory_locations_service_1.InventoryLocationsService,
        inventory_stock_service_1.InventoryStockService])
], InventoryTransfersService);
//# sourceMappingURL=inventory-transfers.service.js.map