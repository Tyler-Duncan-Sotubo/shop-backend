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
exports.CheckoutPaymentsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
let CheckoutPaymentsService = class CheckoutPaymentsService {
    constructor(db) {
        this.db = db;
    }
    firstRow(res) {
        return res?.rows?.[0] ?? res?.[0] ?? null;
    }
    async initBankTransferForCheckout(companyId, storeId, dto) {
        return this.db.transaction(async (tx) => {
            const ordRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT * FROM orders
          WHERE company_id = ${companyId}
            AND store_id = ${storeId}
            AND checkout_id = ${dto.checkoutId}
          LIMIT 1
          FOR UPDATE
        `);
            const ord = this.firstRow(ordRes);
            if (!ord)
                throw new common_1.NotFoundException('Order not found for checkout');
            if (ord.status !== 'pending_payment') {
                throw new common_1.BadRequestException(`Order is not pending payment (status: ${ord.status})`);
            }
            const invRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT * FROM invoices
          WHERE company_id = ${companyId}
            AND order_id = ${ord.id}
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE
        `);
            const inv = this.firstRow(invRes);
            if (!inv) {
                throw new common_1.BadRequestException('Invoice not found for order');
            }
            const balanceMinor = Number(inv.balance_minor ?? inv.balanceMinor ?? 0);
            const totalMinor = Number(inv.total_minor ?? inv.totalMinor ?? 0);
            const paidMinor = Number(inv.paid_minor ?? inv.paidMinor ?? 0);
            const outstandingMinor = balanceMinor > 0 ? balanceMinor : Math.max(totalMinor - paidMinor, 0);
            if (outstandingMinor <= 0) {
                throw new common_1.BadRequestException('Invoice already fully paid');
            }
            const currency = (inv.currency ?? ord.currency ?? 'NGN').toUpperCase();
            const [existing] = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.payments.orderId, ord.id), (0, drizzle_orm_1.eq)(schema_1.payments.invoiceId, inv.id), (0, drizzle_orm_1.eq)(schema_1.payments.method, 'bank_transfer'), (0, drizzle_orm_1.eq)(schema_1.payments.status, 'pending')))
                .limit(1)
                .execute();
            let payment = existing ?? null;
            if (!payment) {
                const [created] = await tx
                    .insert(schema_1.payments)
                    .values({
                    companyId,
                    storeId,
                    orderId: ord.id,
                    invoiceId: inv.id,
                    method: 'bank_transfer',
                    status: 'pending',
                    currency,
                    amountMinor: outstandingMinor,
                    reference: null,
                    meta: {
                        source: 'storefront',
                        checkoutId: dto.checkoutId,
                        customerEmail: dto.customerEmail ?? null,
                        customerPhone: dto.customerPhone ?? null,
                        createdAt: new Date().toISOString(),
                    },
                    createdAt: new Date(),
                })
                    .returning()
                    .execute();
                payment = created;
            }
            const brandingRows = await tx
                .select()
                .from(schema_1.invoiceBranding)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.sql) `(${schema_1.invoiceBranding.storeId} IS NULL OR ${schema_1.invoiceBranding.storeId} = ${storeId})`))
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.invoiceBranding.storeId} DESC NULLS LAST`)
                .limit(1)
                .execute();
            const branding = brandingRows?.[0] ?? null;
            const bankDetails = branding?.bankDetails ?? null;
            if (!bankDetails) {
                throw new common_1.BadRequestException('Bank details not configured. Add bank details in invoice branding/settings.');
            }
            return {
                payment: {
                    id: payment.id,
                    status: payment.status,
                    method: payment.method,
                    currency: payment.currency,
                    amountMinor: Number(payment.amountMinor ?? payment.amountMinor),
                },
                order: {
                    id: ord.id,
                    orderNumber: ord.order_number ?? ord.orderNumber ?? null,
                },
                invoice: {
                    id: inv.id,
                    number: inv.number ?? null,
                    status: inv.status ?? null,
                    outstandingMinor,
                    currency,
                },
                bankDetails,
            };
        });
    }
};
exports.CheckoutPaymentsService = CheckoutPaymentsService;
exports.CheckoutPaymentsService = CheckoutPaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object])
], CheckoutPaymentsService);
//# sourceMappingURL=checkout-payment.service.js.map