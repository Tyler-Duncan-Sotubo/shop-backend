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
exports.OrderDispatchService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const dispatch_notification_service_1 = require("../../notification/services/dispatch-notification.service");
const notifications_service_1 = require("../../notification/services/notifications.service");
let OrderDispatchService = class OrderDispatchService {
    constructor(db, stock, cache, dispatchNotification, notifications) {
        this.db = db;
        this.stock = stock;
        this.cache = cache;
        this.dispatchNotification = dispatchNotification;
        this.notifications = notifications;
    }
    async requestDispatch(companyId, storeId, orderId, actor, note) {
        const dispatch = await this.db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.storeId !== storeId) {
                throw new common_1.BadRequestException('Order does not belong to this store');
            }
            if (order.status !== 'paid' && order.status !== 'lay_buy') {
                throw new common_1.BadRequestException('Only paid or lay-buy orders can be dispatched');
            }
            const existing = await tx
                .select({ id: schema_1.orderDispatches.id })
                .from(schema_1.orderDispatches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.status, 'pending')))
                .limit(1)
                .execute();
            if (existing.length > 0) {
                throw new common_1.BadRequestException('A dispatch request is already pending for this order');
            }
            const [dispatch] = await tx
                .insert(schema_1.orderDispatches)
                .values({
                companyId,
                storeId,
                orderId,
                status: 'pending',
                requestedByUserId: actor.id,
                note: note ?? null,
            })
                .returning()
                .execute();
            await tx
                .update(schema_1.orders)
                .set({ status: 'awaiting_dispatch', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'dispatch_requested',
                fromStatus: order.status,
                toStatus: 'awaiting_dispatch',
                actorUserId: actor.id,
                ipAddress: actor.ip ?? null,
                message: 'Dispatch requested — awaiting inventory manager confirmation',
            });
            return dispatch;
        });
        try {
            const [actorName, managerEmails, store, orderRow, itemCountRow] = await Promise.all([
                this.getActorName(actor.id),
                this.getUserEmailsByRoles(companyId, ['inventory_manager']),
                this.db.query.stores.findFirst({
                    columns: { name: true },
                    where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, storeId)),
                }),
                this.db
                    .select()
                    .from(schema_1.orders)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                    .limit(1)
                    .execute()
                    .then((r) => r[0] ?? null),
                this.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                    .from(schema_1.orderItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                    .execute()
                    .then((r) => Number(r[0]?.count ?? 0)),
            ]);
            const shippingAddress = orderRow?.shippingAddress;
            const customerName = shippingAddress
                ? [shippingAddress?.firstName, shippingAddress?.lastName]
                    .filter(Boolean)
                    .join(' ') || null
                : null;
            await Promise.all(managerEmails.map((toEmail) => this.dispatchNotification.sendRequestDispatchEmail({
                toEmail,
                orderNumber: orderRow?.orderNumber ?? orderId,
                orderId,
                customerName,
                itemCount: itemCountRow,
                total: orderRow?.total ?? null,
                currency: orderRow?.currency ?? null,
                requestedBy: actorName,
                storeName: store?.name ?? undefined,
                shippingAddress: shippingAddress
                    ? {
                        city: shippingAddress?.city ?? null,
                        state: shippingAddress?.state ?? null,
                        country: shippingAddress?.country ?? null,
                    }
                    : null,
            })));
            this.notifications
                .create({
                companyId,
                type: 'dispatch_requested',
                title: 'Dispatch requested',
                body: `Order #${orderRow?.orderNumber ?? orderId} has been sent to the warehouse`,
                data: {
                    orderId,
                    orderNumber: orderRow?.orderNumber ?? null,
                    dispatchId: dispatch.id,
                    itemCount: itemCountRow,
                },
                channel: 'in_app',
            })
                .catch(console.error);
        }
        catch (err) {
            console.error('Failed to send request dispatch emails:', err);
        }
        return dispatch;
    }
    async confirmDispatch(companyId, storeId, orderId, actor, note) {
        const result = await this.db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.storeId !== storeId) {
                throw new common_1.BadRequestException('Order does not belong to this store');
            }
            const [dispatch] = await tx
                .select()
                .from(schema_1.orderDispatches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.status, 'pending')))
                .limit(1)
                .execute();
            if (!dispatch) {
                throw new common_1.NotFoundException('No pending dispatch request found for this order');
            }
            const allowedStatuses = ['awaiting_dispatch', 'paid', 'pending_payment'];
            if (!allowedStatuses.includes(order.status)) {
                throw new common_1.BadRequestException(`Order cannot be dispatched from status '${order.status}'`);
            }
            const origin = order.originInventoryLocationId;
            if (!origin) {
                throw new common_1.BadRequestException('Order missing originInventoryLocationId');
            }
            if (order.fulfillmentModel === 'payment_first') {
                const items = await tx
                    .select()
                    .from(schema_1.orderItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                    .execute();
                for (const it of items) {
                    if (!it.variantId)
                        continue;
                    const qty = Number(it.quantity ?? 0);
                    if (qty <= 0)
                        continue;
                    await this.stock.reserveForOrderInTx(tx, companyId, orderId, origin, it.variantId, qty, `Reserved stock for dispatch of order ${order.orderNumber ?? orderId}`);
                }
            }
            await this.stock.fulfillOrderReservationsInTx(tx, companyId, orderId);
            await tx
                .update(schema_1.orderDispatches)
                .set({
                status: 'dispatched',
                confirmedByUserId: actor.id,
                note: note ?? dispatch.note,
                dispatchedAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.id, dispatch.id)))
                .execute();
            const [updated] = await tx
                .update(schema_1.orders)
                .set({ status: 'fulfilled', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'dispatched',
                fromStatus: order.status,
                toStatus: 'fulfilled',
                actorUserId: actor.id,
                ipAddress: actor.ip ?? null,
                message: 'Order dispatched and fulfilled by warehouse manager',
            });
            return { order: updated, dispatch };
        });
        await this.cache.bumpCompanyVersion(companyId);
        try {
            const [actorName, recipientEmails, store, itemCountRow] = await Promise.all([
                this.getActorName(actor.id),
                this.getUserEmailsByRoles(companyId, ['owner', 'manager']),
                this.db.query.stores.findFirst({
                    columns: { name: true },
                    where: (f, { and, eq }) => and(eq(f.companyId, companyId), eq(f.id, storeId)),
                }),
                this.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
                    .from(schema_1.orderItems)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                    .execute()
                    .then((r) => Number(r[0]?.count ?? 0)),
            ]);
            const order = result.order;
            const dispatch = result.dispatch;
            const shippingAddress = order?.shippingAddress;
            const customerName = shippingAddress
                ? [shippingAddress?.firstName, shippingAddress?.lastName]
                    .filter(Boolean)
                    .join(' ') || null
                : null;
            await Promise.all(recipientEmails.map((toEmail) => this.dispatchNotification.sendConfirmDispatchEmail({
                toEmail,
                orderNumber: order.orderNumber ?? orderId,
                orderId,
                customerName,
                itemCount: itemCountRow,
                total: order.total ?? null,
                currency: order.currency ?? null,
                confirmedBy: actorName,
                dispatchedAt: dispatch.dispatchedAt?.toISOString() ?? null,
                storeName: store?.name ?? undefined,
                shippingAddress: shippingAddress
                    ? {
                        city: shippingAddress?.city ?? null,
                        state: shippingAddress?.state ?? null,
                        country: shippingAddress?.country ?? null,
                    }
                    : null,
            })));
            this.notifications
                .create({
                companyId,
                type: 'order_fulfilled',
                title: 'Order fulfilled',
                body: `Order #${result.order.orderNumber ?? orderId} has been dispatched and fulfilled`,
                data: {
                    orderId,
                    orderNumber: result.order.orderNumber ?? null,
                    dispatchId: result.dispatch.id,
                    dispatchedAt: result.dispatch.dispatchedAt?.toISOString() ?? null,
                    itemCount: itemCountRow,
                },
                channel: 'in_app',
            })
                .catch(console.error);
        }
        catch (err) {
            console.error('Failed to send confirm dispatch emails:', err);
        }
        return result;
    }
    async cancelDispatch(companyId, orderId, actor, note) {
        return this.db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!order)
                throw new common_1.NotFoundException('Order not found');
            if (order.status !== 'awaiting_dispatch') {
                throw new common_1.BadRequestException('Order is not awaiting dispatch');
            }
            const [dispatch] = await tx
                .select()
                .from(schema_1.orderDispatches)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.orderId, orderId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.status, 'pending')))
                .limit(1)
                .execute();
            if (!dispatch) {
                throw new common_1.NotFoundException('No pending dispatch request found');
            }
            await tx
                .update(schema_1.orderDispatches)
                .set({
                status: 'cancelled',
                note: note ?? dispatch.note,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.id, dispatch.id)))
                .execute();
            const previousStatus = order.fulfillmentModel === 'lay_buy' ? 'lay_buy' : 'paid';
            await tx
                .update(schema_1.orders)
                .set({ status: previousStatus, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'dispatch_cancelled',
                fromStatus: 'awaiting_dispatch',
                toStatus: previousStatus,
                actorUserId: actor.id,
                ipAddress: actor.ip ?? null,
                message: 'Dispatch request cancelled',
            });
            return dispatch;
        });
    }
    async listDispatches(companyId, storeId, status) {
        const rows = await this.db
            .select({
            dispatch: schema_1.orderDispatches,
            orderNumber: schema_1.orders.orderNumber,
            orderStatus: schema_1.orders.status,
            customerId: schema_1.orders.customerId,
            shippingAddress: schema_1.orders.shippingAddress,
            total: schema_1.orders.total,
            currency: schema_1.orders.currency,
            itemCount: (0, drizzle_orm_1.sql) `
        (SELECT COUNT(*) FROM order_items oi
         WHERE oi.order_id = ${schema_1.orderDispatches.orderId}
         AND oi.company_id = ${companyId})
      `.as('item_count'),
        })
            .from(schema_1.orderDispatches)
            .leftJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.orderDispatches.orderId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.storeId, storeId), status ? (0, drizzle_orm_1.eq)(schema_1.orderDispatches.status, status) : undefined))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orderDispatches.createdAt))
            .execute();
        return rows.map((r) => ({
            ...r.dispatch,
            orderNumber: r.orderNumber ?? null,
            orderStatus: r.orderStatus ?? null,
            currency: r.currency ?? null,
            total: r.total ?? null,
            itemCount: Number(r.itemCount ?? 0),
            customerName: r.shippingAddress
                ? [
                    r.shippingAddress?.firstName,
                    r.shippingAddress?.lastName,
                ]
                    .filter(Boolean)
                    .join(' ') || null
                : null,
            shippingAddress: r.shippingAddress ?? null,
        }));
    }
    async getDispatch(companyId, orderId) {
        const [dispatch] = await this.db
            .select()
            .from(schema_1.orderDispatches)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderDispatches.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderDispatches.orderId, orderId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.orderDispatches.createdAt))
            .limit(1)
            .execute();
        if (!dispatch)
            throw new common_1.NotFoundException('Dispatch record not found');
        const items = await this.db
            .select({
            id: schema_1.orderItems.id,
            name: schema_1.orderItems.name,
            sku: schema_1.orderItems.sku,
            quantity: schema_1.orderItems.quantity,
            unitPrice: schema_1.orderItems.unitPrice,
            lineTotal: schema_1.orderItems.lineTotal,
            variantId: schema_1.orderItems.variantId,
            productId: schema_1.orderItems.productId,
        })
            .from(schema_1.orderItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
            .execute();
        return {
            ...dispatch,
            items: items.map((it) => ({
                id: it.id,
                name: it.name,
                sku: it.sku ?? null,
                quantity: Number(it.quantity ?? 0),
                unitPrice: it.unitPrice ?? null,
                lineTotal: it.lineTotal ?? null,
                variantId: it.variantId ?? null,
                productId: it.productId ?? null,
            })),
        };
    }
    async getUserEmailsByRoles(companyId, roleNames) {
        const rows = await this.db
            .select({
            email: schema_1.users.email,
        })
            .from(schema_1.users)
            .innerJoin(schema_1.companyRoles, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companyRoles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companyRoles.id, schema_1.users.companyRoleId), (0, drizzle_orm_1.inArray)(schema_1.companyRoles.name, roleNames)))
            .where((0, drizzle_orm_1.eq)(schema_1.users.companyId, companyId))
            .execute();
        return rows.map((r) => r.email).filter(Boolean);
    }
    async getActorName(actorId) {
        const [user] = await this.db
            .select({
            firstName: schema_1.users.firstName,
            lastName: schema_1.users.lastName,
        })
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, actorId))
            .limit(1)
            .execute();
        if (!user)
            return null;
        return [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
    }
};
exports.OrderDispatchService = OrderDispatchService;
exports.OrderDispatchService = OrderDispatchService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, inventory_stock_service_1.InventoryStockService,
        cache_service_1.CacheService,
        dispatch_notification_service_1.DispatchNotificationService,
        notifications_service_1.NotificationsService])
], OrderDispatchService);
//# sourceMappingURL=order-dispatch.service.js.map