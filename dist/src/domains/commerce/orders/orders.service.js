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
const schema_1 = require("../../../infrastructure/drizzle/schema");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
const zoho_books_service_1 = require("../../integration/zoho/zoho-books.service");
const shipping_zones_service_1 = require("../../fulfillment/shipping/services/shipping-zones.service");
const shipping_rates_service_1 = require("../../fulfillment/shipping/services/shipping-rates.service");
let OrdersService = class OrdersService {
    constructor(db, cache, stock, zohoBooks, shippingZonesService, shippingRatesService) {
        this.db = db;
        this.cache = cache;
        this.stock = stock;
        this.zohoBooks = zohoBooks;
        this.shippingZonesService = shippingZonesService;
        this.shippingRatesService = shippingRatesService;
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
            if (before.status !== 'pending_payment' && before.status !== 'lay_buy') {
                throw new common_1.BadRequestException('Only pending_payment or lay-buy orders can be cancelled');
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
            if (before.fulfillmentModel === 'stock_first') {
                for (const it of items) {
                    if (!it.variantId)
                        continue;
                    const qty = Number(it.quantity ?? 0);
                    if (qty <= 0)
                        continue;
                    await this.stock.releaseReservationInTx(tx, companyId, orderId, origin, it.variantId, qty);
                }
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
    async convertToLayBuy(companyId, orderId, user, ip) {
        const result = await this.db.transaction(async (tx) => {
            const [before] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!before)
                throw new common_1.NotFoundException('Order not found');
            if (before.status !== 'pending_payment' && before.status !== 'draft') {
                throw new common_1.BadRequestException('Only pending_payment or draft orders can be converted to lay-buy');
            }
            const [after] = await tx
                .update(schema_1.orders)
                .set({ status: 'lay_buy', updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'converted_to_lay_buy',
                fromStatus: before.status,
                toStatus: after.status,
                actorUserId: user?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Order converted to lay-buy — fulfillment before payment',
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
            if (before.status !== 'paid' && before.status !== 'lay_buy') {
                throw new common_1.BadRequestException('Only paid or lay-buy orders can be fulfilled');
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
                if (before.fulfillmentModel === 'payment_first') {
                    await this.stock.reserveForOrderInTx(tx, companyId, orderId, origin, it.variantId, qty, `Reserved remaining stock for order ${before.orderNumber ?? orderId}`);
                }
                await this.stock.fulfillFromReservationInTx(tx, companyId, origin, it.variantId, qty, { refType: 'order', refId: orderId }, { orderId, fulfillmentModel: before.fulfillmentModel });
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
    async updateCustomerAndShipping(companyId, orderId, payload, user, ip) {
        return this.db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .for('update')
                .execute();
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.status === 'fulfilled' || order.status === 'cancelled') {
                throw new common_1.BadRequestException('Customer/shipping cannot be changed for this order status');
            }
            let customerId = payload.customerId ?? null;
            if (!customerId && payload.createCustomer) {
                const email = payload.createCustomer.email.trim().toLowerCase();
                const existingCustomer = await tx.query.customers.findFirst({
                    where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customers.billingEmail, email)),
                });
                if (existingCustomer) {
                    customerId = existingCustomer.id;
                }
                else {
                    const displayName = [
                        payload.createCustomer.firstName,
                        payload.createCustomer.lastName,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .trim();
                    const [createdCustomer] = await tx
                        .insert(schema_1.customers)
                        .values({
                        companyId,
                        storeId: order.storeId,
                        billingEmail: email,
                        firstName: payload.createCustomer.firstName ?? null,
                        lastName: payload.createCustomer.lastName ?? null,
                        displayName: displayName || email,
                        phone: payload.createCustomer.phone ?? null,
                        isActive: true,
                    })
                        .returning()
                        .execute();
                    customerId = createdCustomer.id;
                }
            }
            if (!customerId) {
                throw new common_1.BadRequestException('customerId or createCustomer is required');
            }
            const customer = await tx.query.customers.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customers.id, customerId)),
            });
            if (!customer) {
                throw new common_1.BadRequestException('Customer not found');
            }
            if (customer.storeId && customer.storeId !== order.storeId) {
                throw new common_1.BadRequestException('Customer does not belong to this store');
            }
            const customerAddressRows = await tx
                .select()
                .from(schema_1.customerAddresses)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customerAddresses.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.customerAddresses.customerId, customerId)))
                .execute();
            if (!customerAddressRows.length) {
                throw new common_1.BadRequestException('Customer has no saved addresses');
            }
            let shippingAddress = payload.shippingAddressId
                ? (customerAddressRows.find((a) => a.id === payload.shippingAddressId) ?? null)
                : (customerAddressRows.find((a) => a.isDefaultShipping) ??
                    customerAddressRows[0] ??
                    null);
            if (!shippingAddress) {
                throw new common_1.BadRequestException('Shipping address not found for customer');
            }
            let billingAddress = payload.billingAddressId
                ? (customerAddressRows.find((a) => a.id === payload.billingAddressId) ??
                    null)
                : (customerAddressRows.find((a) => a.isDefaultBilling) ??
                    shippingAddress);
            if (!billingAddress) {
                billingAddress = shippingAddress;
            }
            const orderItemsRows = await tx
                .select({
                quantity: schema_1.orderItems.quantity,
                weight: schema_1.productVariants.weight,
            })
                .from(schema_1.orderItems)
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, schema_1.orderItems.companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_1.orderItems.variantId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orderItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orderItems.orderId, orderId)))
                .execute();
            const totalWeightGrams = orderItemsRows.reduce((sum, row) => {
                const qty = Number(row.quantity ?? 0);
                const weight = Number(row.weight ?? 0);
                return sum + qty * weight;
            }, 0);
            const shippingQuote = await this.getShippingQuoteForOrder(companyId, {
                storeId: order.storeId,
                shippingAddress,
                totalWeightGrams,
                shippingRateId: payload.shippingRateId ?? null,
            });
            const subtotal = Number(order.subtotal ?? 0);
            const taxTotal = Number(order.taxTotal ?? 0);
            const discountTotal = Number(order.discountTotal ?? 0);
            const shippingTotal = Number(shippingQuote.amount ?? 0);
            const total = subtotal + taxTotal + shippingTotal - discountTotal;
            const subtotalMinor = Number(order.subtotalMinor ?? 0);
            const taxTotalMinor = Number(order.taxTotalMinor ?? 0);
            const discountTotalMinor = Number(order.discountTotalMinor ?? 0);
            const shippingTotalMinor = Math.round(shippingTotal * 100);
            const totalMinor = subtotalMinor + taxTotalMinor + shippingTotalMinor - discountTotalMinor;
            const shippingSnapshot = {
                customerAddressId: shippingAddress.id,
                label: shippingAddress.label ?? null,
                firstName: shippingAddress.firstName ?? null,
                lastName: shippingAddress.lastName ?? null,
                email: customer.billingEmail ?? null,
                phone: shippingAddress.phone ?? customer.phone ?? null,
                address1: shippingAddress.line1 ?? null,
                address2: shippingAddress.line2 ?? null,
                city: shippingAddress.city ?? null,
                state: shippingAddress.state ?? null,
                postalCode: shippingAddress.postalCode ?? null,
                country: shippingAddress.country ?? null,
                isDefaultShipping: shippingAddress.isDefaultShipping ?? false,
            };
            const billingSnapshot = {
                customerAddressId: billingAddress.id,
                label: billingAddress.label ?? null,
                firstName: billingAddress.firstName ?? null,
                lastName: billingAddress.lastName ?? null,
                email: customer.billingEmail ?? null,
                phone: billingAddress.phone ?? customer.phone ?? null,
                address1: billingAddress.line1 ?? null,
                address2: billingAddress.line2 ?? null,
                city: billingAddress.city ?? null,
                state: billingAddress.state ?? null,
                postalCode: billingAddress.postalCode ?? null,
                country: billingAddress.country ?? null,
                isDefaultBilling: billingAddress.isDefaultBilling ?? false,
            };
            const shippingQuoteSnapshot = shippingQuote
                ? {
                    zone: shippingQuote.zone
                        ? {
                            id: shippingQuote.zone.id,
                            name: shippingQuote.zone.name,
                            priority: shippingQuote.zone.priority ?? null,
                        }
                        : null,
                    rate: shippingQuote.rate
                        ? {
                            id: shippingQuote.rate.id,
                            name: shippingQuote.rate.name,
                            calc: shippingQuote.rate.calc ?? null,
                            isDefault: shippingQuote.rate.isDefault ?? false,
                            type: shippingQuote.rate.type ?? null,
                        }
                        : null,
                    amount: shippingQuote.amount ?? 0,
                    totalWeightGrams,
                }
                : null;
            const [updated] = await tx
                .update(schema_1.orders)
                .set({
                customerId,
                shippingZoneId: shippingQuote.zone?.id ?? null,
                selectedShippingRateId: shippingQuote.rate?.id ?? null,
                shippingAddress: shippingSnapshot,
                billingAddress: billingSnapshot,
                shippingMethodLabel: shippingQuote.rate?.name ?? null,
                deliveryMethodType: 'shipping',
                shippingQuote: shippingQuoteSnapshot,
                shippingTotal: String(shippingTotal),
                total: String(total),
                shippingTotalMinor,
                totalMinor,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .returning()
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'shipping_updated',
                actorUserId: user?.id ?? null,
                ipAddress: ip ?? null,
                message: 'Order customer/shipping details updated',
            });
            return updated;
        });
    }
    async getShippingQuoteForOrder(companyId, args) {
        const normalizeCountryCode = (value) => {
            const v = (value ?? '').trim().toUpperCase();
            if (v === 'UNITED KINGDOM' || v === 'UK' || v === 'GB')
                return 'GB';
            if (v === 'NIGERIA' || v === 'NG')
                return 'NG';
            if (v === 'UNITED STATES' || v === 'USA' || v === 'US')
                return 'US';
            return v;
        };
        const zone = await this.shippingZonesService.resolveZone(companyId, args.storeId, normalizeCountryCode(args.shippingAddress.country ?? 'NG'), args.shippingAddress.state ?? undefined, args.shippingAddress.city ?? undefined);
        if (!zone) {
            return {
                zone: null,
                rate: null,
                amount: 0,
            };
        }
        const allRates = await this.shippingRatesService.listRates(companyId, {
            zoneId: zone.id,
            storeId: args.storeId,
        });
        const activeRates = allRates.filter((r) => r.isActive);
        let selectedRate = args.shippingRateId
            ? activeRates.find((r) => r.id === args.shippingRateId)
            : (activeRates.find((r) => r.isDefault) ?? activeRates[0]);
        if (!selectedRate) {
            return {
                zone,
                rate: null,
                amount: 0,
            };
        }
        const amount = await this.shippingRatesService.computeRateAmount(companyId, selectedRate.id, selectedRate.calc, args.totalWeightGrams);
        return {
            zone,
            rate: selectedRate,
            amount: Number(amount ?? 0),
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        inventory_stock_service_1.InventoryStockService,
        zoho_books_service_1.ZohoBooksService,
        shipping_zones_service_1.ShippingZonesService,
        shipping_rates_service_1.ShippingRatesService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map