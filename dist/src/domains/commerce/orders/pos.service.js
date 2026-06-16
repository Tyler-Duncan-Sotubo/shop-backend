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
exports.POSService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const invoice_service_1 = require("../../billing/invoice/invoice.service");
const notifications_service_1 = require("../../notification/services/notifications.service");
const manual_orders_service_1 = require("./manual-orders.service");
const payment_service_1 = require("../../billing/payment/services/payment.service");
const sql_1 = require("drizzle-orm/sql/sql");
const inventory_stock_service_1 = require("../inventory/services/inventory-stock.service");
let POSService = class POSService {
    constructor(db, cache, manualOrders, invoiceService, paymentService, notifications, stock) {
        this.db = db;
        this.cache = cache;
        this.manualOrders = manualOrders;
        this.invoiceService = invoiceService;
        this.paymentService = paymentService;
        this.notifications = notifications;
        this.stock = stock;
    }
    async checkout(companyId, dto, actor) {
        const currency = dto.currency ?? 'NGN';
        const order = await this.manualOrders.createManualOrder(companyId, {
            storeId: dto.storeId,
            currency,
            channel: 'pos',
            fulfillmentModel: 'payment_first',
            originInventoryLocationId: dto.originInventoryLocationId,
            skipDraft: false,
        }, actor);
        const orderId = order.id;
        for (const item of dto.items) {
            await this.manualOrders.addItem(companyId, {
                orderId,
                variantId: item.variantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice ?? undefined,
            }, false, actor);
        }
        if (dto.customItems.length > 0) {
            await this.addCustomItems(companyId, orderId, dto.storeId, dto.customItems, currency);
        }
        if (dto.discounts.length > 0) {
            const totalDiscount = dto.discounts.reduce((sum, d) => sum + d.amount, 0);
            const discountNote = dto.discounts.map((d) => d.label).join(', ');
            await this.manualOrders.applyDiscount(companyId, orderId, { type: 'flat', value: totalDiscount }, actor);
            if (!dto.note && discountNote) {
                await this.db
                    .update(schema_1.orders)
                    .set({ note: discountNote, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                    .execute();
            }
        }
        await this.manualOrders.submitForPayment(companyId, orderId, actor, undefined, { skipInvoice: true });
        const invoice = await this.manualOrders.syncInvoiceAfterItems(companyId, orderId);
        if (!invoice) {
            throw new common_1.BadRequestException('Failed to create invoice for POS order');
        }
        if (dto.applyVat) {
            await this.applyStoreTax(companyId, dto.storeId, invoice.id);
        }
        const issuedInvoice = await this.invoiceService.issueInvoice(invoice.id, { storeId: dto.storeId }, companyId, actor.id, undefined, { autoSyncZoho: false });
        const totalMinor = Number(issuedInvoice.totalMinor ?? 0);
        const totalMajor = totalMinor / 100;
        const { paymentId, receiptId, receipt } = await this.paymentService.recordInvoicePayment({
            invoiceId: issuedInvoice.id,
            amount: totalMajor,
            currency,
            method: dto.paymentMethod === 'pos_machine' ? 'pos' : dto.paymentMethod,
            reference: null,
            meta: {
                channel: 'pos',
                paymentMethod: dto.paymentMethod,
            },
        }, companyId, actor.id);
        await this.db.transaction(async (tx) => {
            const origin = dto.originInventoryLocationId;
            for (const item of dto.items) {
                await this.stock.reserveForOrderInTx(tx, companyId, orderId, origin, item.variantId, item.quantity, `POS sale — Order #${order.orderNumber}`);
            }
            await this.stock.fulfillOrderReservationsInTx(tx, companyId, orderId);
            await tx
                .update(schema_1.orders)
                .set({
                status: 'fulfilled',
                fulfilledAt: new Date(),
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .execute();
            await tx.insert(schema_1.orderEvents).values({
                companyId,
                orderId,
                type: 'fulfilled',
                fromStatus: 'paid',
                toStatus: 'fulfilled',
                actorUserId: actor.id,
                message: 'Auto-fulfilled at POS — goods handed over at counter',
            });
        });
        if (dto.customer?.name || dto.customer?.phone || dto.customer?.email) {
            this.findOrCreateCustomer(companyId, dto.storeId, orderId, dto.customer).catch(console.error);
        }
        this.notifications
            .create({
            companyId,
            type: 'payment_received',
            title: 'POS Sale complete',
            body: `${currency} ${totalMajor.toLocaleString()} via ${dto.paymentMethod} — Order #${order.orderNumber}`,
            data: {
                orderId,
                orderNumber: order.orderNumber,
                paymentId,
                receiptId,
                fulfilled: true,
            },
            channel: 'in_app',
        })
            .catch(console.error);
        await this.cache.bumpCompanyVersion(companyId);
        return {
            orderId,
            orderNumber: order.orderNumber,
            invoiceId: issuedInvoice.id,
            paymentId,
            receiptId,
            receiptNumber: receipt?.receiptNumber ?? null,
            totalMinor,
            totalMajor,
            currency,
        };
    }
    async addCustomItems(companyId, orderId, storeId, items, currency) {
        for (const item of items) {
            const unitPriceMinor = Math.round(item.unitPrice * 100);
            const lineTotalMinor = unitPriceMinor * item.quantity;
            await this.db
                .insert(schema_1.orderCustomItems)
                .values({
                companyId,
                storeId,
                orderId,
                name: item.name.trim(),
                note: item.note ?? null,
                quantity: item.quantity,
                unitPrice: String(item.unitPrice),
                unitPriceMinor,
                lineTotal: String(item.unitPrice * item.quantity),
                lineTotalMinor,
                currency,
            })
                .execute();
        }
        await this.recalculateWithCustomItems(companyId, orderId);
    }
    async recalculateWithCustomItems(companyId, orderId) {
        const result = await this.db.execute((0, sql_1.sql) `
      SELECT COALESCE(SUM(line_total_minor), 0) as custom_total_minor
      FROM order_custom_items
      WHERE company_id = ${companyId} AND order_id = ${orderId}
    `);
        const rows = result?.rows ?? result;
        const row = Array.isArray(rows) ? rows[0] : rows;
        const customTotalMinor = Number(row?.custom_total_minor ?? 0);
        if (customTotalMinor === 0)
            return;
        const customTotal = customTotalMinor / 100;
        await this.db.execute((0, sql_1.sql) `
      UPDATE orders
      SET
        subtotal = COALESCE(subtotal::numeric, 0) + ${customTotal},
        total = GREATEST(
          COALESCE(subtotal::numeric, 0) + ${customTotal} - COALESCE(discount_total::numeric, 0),
          0
        ),
        updated_at = NOW()
      WHERE company_id = ${companyId} AND id = ${orderId}
    `);
    }
    async applyStoreTax(companyId, storeId, invoiceId) {
        const [tax] = await this.db
            .select()
            .from(schema_1.taxes)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.taxes.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.taxes.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.taxes.isActive, true), (0, drizzle_orm_1.eq)(schema_1.taxes.isDefault, true)))
            .limit(1)
            .execute();
        if (!tax)
            return;
        await this.db.execute((0, sql_1.sql) `
        UPDATE invoice_lines
        SET
          tax_id = ${tax.id},
          tax_name = ${tax.name},
          tax_rate_bps = ${tax.rateBps},
          tax_inclusive = false
        WHERE invoice_id = ${invoiceId}
          AND (meta->>'kind' IS NULL OR meta->>'kind' != 'shipping')
      `);
        await this.invoiceService.recalculateDraftTotals(companyId, invoiceId);
    }
    async findOrCreateCustomer(companyId, storeId, orderId, input) {
        const phone = input.phone?.trim() || null;
        const email = input.email?.trim().toLowerCase() || null;
        const name = input.name?.trim() || null;
        if (phone || email) {
            const [existing] = await this.db
                .select({ id: schema_1.customers.id })
                .from(schema_1.customers)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.customers.companyId, companyId), phone
                ? (0, drizzle_orm_1.eq)(schema_1.customers.phone, phone)
                : email
                    ? (0, drizzle_orm_1.eq)(schema_1.customers.billingEmail, email)
                    : undefined))
                .limit(1)
                .execute();
            if (existing) {
                await this.db
                    .update(schema_1.orders)
                    .set({ customerId: existing.id, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                    .execute();
                return existing;
            }
        }
        const displayName = name ?? phone ?? email ?? 'Walk-in Customer';
        const [created] = await this.db
            .insert(schema_1.customers)
            .values({
            companyId,
            storeId,
            displayName,
            type: 'individual',
            firstName: name?.split(' ')[0] ?? null,
            lastName: name?.split(' ').slice(1).join(' ') || null,
            billingEmail: email ?? null,
            phone: phone ?? null,
            marketingOptIn: false,
            isActive: true,
        })
            .returning({ id: schema_1.customers.id })
            .execute();
        await this.db
            .update(schema_1.orders)
            .set({ customerId: created.id, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        return created;
    }
};
exports.POSService = POSService;
exports.POSService = POSService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        manual_orders_service_1.ManualOrdersService,
        invoice_service_1.InvoiceService,
        payment_service_1.PaymentService,
        notifications_service_1.NotificationsService,
        inventory_stock_service_1.InventoryStockService])
], POSService);
//# sourceMappingURL=pos.service.js.map