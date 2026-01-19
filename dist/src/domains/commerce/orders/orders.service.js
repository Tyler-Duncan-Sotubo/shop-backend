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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
let OrdersService = class OrdersService {
    constructor(db, cache, audit, stock) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
        this.stock = stock;
    }
    async getOrder(companyId, orderId) {
        const order = await this.db
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        if (!order?.[0])
            throw new common_1.NotFoundException('Order not found');
        const rows = await this.db
            .select({
            item: schema_1.orderItems,
            imageUrl: schema_1.productImages.url,
        })
            .from(schema_1.orderItems)
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.productVariants.imageId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
            .execute();
        const items = rows.map((r) => ({
            ...r.item,
            imageUrl: r.imageUrl ?? null,
        }));
        const events = await this.db
            .select()
            .from(schema_1.orderEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderEvents.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderEvents.orderId, orderId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orderEvents.createdAt))
            .execute();
        return { ...order[0], items, events };
    }
    async getOrderStorefront(companyId, storeId, orderId) {
        const orderRows = await this.db
            .select()
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        const order = orderRows?.[0];
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const rows = await this.db
            .select({
            item: schema_1.orderItems,
            imageUrl: schema_1.productImages.url,
        })
            .from(schema_1.orderItems)
            .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.productVariants.imageId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
            .execute();
        const items = rows.map((r) => ({
            ...r.item,
            imageUrl: r.imageUrl ?? null,
        }));
        const events = await this.db
            .select()
            .from(schema_1.orderEvents)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderEvents.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderEvents.orderId, orderId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orderEvents.createdAt))
            .execute();
        const payRows = await this.db
            .select({
            id: schema_1.payments.id,
            method: schema_1.payments.method,
            status: schema_1.payments.status,
            provider: schema_1.payments.provider,
            amountMinor: schema_1.payments.amountMinor,
            currency: schema_1.payments.currency,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.orderId, orderId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.payments.createdAt))
            .limit(1)
            .execute();
        const payment = payRows?.[0] ?? null;
        let evidenceCount = 0;
        let lastEvidenceUrl = null;
        if (payment?.id) {
            const evidenceRows = await this.db
                .select({
                id: schema_1.paymentFiles.id,
                url: schema_1.paymentFiles.url,
                createdAt: schema_1.paymentFiles.createdAt,
            })
                .from(schema_1.paymentFiles)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentFiles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentFiles.paymentId, payment.id)))
                .orderBy((0, drizzle_orm_1.desc)(schema_1.paymentFiles.createdAt))
                .execute();
            evidenceCount = evidenceRows.length;
            lastEvidenceUrl = evidenceRows?.[0]?.url ?? null;
        }
        return {
            ...order,
            items,
            events,
            payment: payment ? { ...payment, evidenceCount, lastEvidenceUrl } : null,
        };
    }
    async listOrders(companyId, q) {
        const limit = Math.min(Number(q.limit ?? 50), 200);
        const offset = Number(q.offset ?? 0);
        const where = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.storeId, q.storeId), q.status ? (0, drizzle_orm_1.eq)(schema_1.orders.status, q.status) : undefined, q.channel ? (0, drizzle_orm_1.eq)(schema_1.orders.channel, q.channel) : undefined, q.search
            ? (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_1.orders.id, `%${q.search}%`), (0, drizzle_orm_1.ilike)(schema_1.orders.orderNumber, `%${q.search}%`), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `${schema_1.orders.shippingAddress}::text`, `%${q.search}%`))
            : undefined);
        const rows = await this.db
            .select()
            .from(schema_1.orders)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orders.createdAt))
            .limit(limit)
            .offset(offset)
            .execute();
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.orders)
            .where(where)
            .execute();
        return { rows, count: Number(count ?? 0), limit, offset };
    }
    async markPaid(companyId, orderId, user, ip) {
        const result = await this.db.transaction(async (tx) => {
            const [before] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!before)
                throw new common_1.NotFoundException('Order not found');
            if (before.status !== 'pending_payment') {
                throw new common_1.BadRequestException('Only pending_payment orders can be marked paid');
            }
            const [after] = await tx
                .update(schema_1.orders)
                .set({ status: 'paid', updatedAt: new Date(), paidAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'marked_paid',
                fromStatus: before.status,
                toStatus: after.status,
                actorUserId: user?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Order marked as paid',
            });
            return after;
        });
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async cancel(companyId, orderId, user, ip) {
        const result = await this.db.transaction(async (tx) => {
            const [before] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!before)
                throw new common_1.NotFoundException('Order not found');
            if (before.status !== 'pending_payment') {
                throw new common_1.BadRequestException('Only pending_payment orders can be cancelled');
            }
            const [inv] = await tx
                .select({ id: schema_1.invoices.id, paidMinor: schema_1.invoices.paidMinor })
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.orderId, orderId)))
                .execute();
            if (!inv)
                throw new common_1.BadRequestException('Order has no invoice');
            const paidMinor = Number(inv.paidMinor ?? 0);
            if (paidMinor > 0) {
                throw new common_1.BadRequestException(`Cannot cancel order with paid invoice amount: ${paidMinor}`);
            }
            const items = await tx
                .select()
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                .execute();
            const origin = before.originInventoryLocationId;
            if (!origin) {
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            }
            for (const it of items) {
                if (!it.variantId)
                    continue;
                const qty = Number(it.quantity ?? 0);
                if (qty <= 0)
                    continue;
                await this.stock.releaseReservationInTx(tx, companyId, origin, it.variantId, qty);
            }
            const [after] = await tx
                .update(schema_1.orders)
                .set({ status: 'cancelled', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'cancelled',
                fromStatus: before.status,
                toStatus: after.status,
                actorUserId: user?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Order cancelled',
            });
            return after;
        });
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
    async fulfill(companyId, orderId, user, ip) {
        const result = await this.db.transaction(async (tx) => {
            const [before] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!before)
                throw new common_1.NotFoundException('Order not found');
            if (before.status !== 'paid') {
                throw new common_1.BadRequestException('Only paid orders can be fulfilled');
            }
            const items = await tx
                .select()
                .from(schema_1.orderItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                .execute();
            const origin = before.originInventoryLocationId;
            if (!origin) {
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            }
            for (const it of items) {
                if (!it.variantId)
                    continue;
                const qty = Number(it.quantity ?? 0);
                if (qty <= 0)
                    continue;
                await this.stock.fulfillFromReservationInTx(tx, companyId, origin, it.variantId, qty);
            }
            const [after] = await tx
                .update(schema_1.orders)
                .set({ status: 'fulfilled', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'fulfilled',
                fromStatus: before.status,
                toStatus: after.status,
                actorUserId: user?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Order fulfilled',
            });
            return after;
        });
        await this.cache.bumpCompanyVersion(companyId);
        return result;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        inventory_stock_service_1.InventoryStockService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map