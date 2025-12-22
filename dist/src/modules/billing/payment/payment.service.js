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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const invoice_service_1 = require("../invoice/invoice.service");
let PaymentService = class PaymentService {
    constructor(db, invoiceService) {
        this.db = db;
        this.invoiceService = invoiceService;
    }
    async handlePaystackSuccess(dto, companyId, userId) {
        return this.db.transaction(async (tx) => {
            const inv = await this.invoiceService.createDraftFromOrder({
                orderId: dto.orderId,
                storeId: dto.storeId ?? null,
                currency: dto.currency,
                type: 'invoice',
            }, companyId, { tx });
            const issued = await this.invoiceService.issueInvoice(inv.id, {
                storeId: inv.storeId ?? null,
            }, companyId, userId, { tx });
            const [existingPayment] = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.provider, 'paystack'), (0, drizzle_orm_1.eq)(schema_1.payments.providerRef, dto.providerRef)))
                .execute();
            let paymentId = existingPayment?.id;
            if (!paymentId) {
                const [p] = await tx
                    .insert(schema_1.payments)
                    .values({
                    companyId,
                    method: 'gateway',
                    status: 'succeeded',
                    currency: dto.currency,
                    amountMinor: Math.trunc(dto.amountMinor),
                    provider: 'paystack',
                    providerRef: dto.providerRef,
                    meta: dto.meta ?? null,
                    receivedAt: new Date(),
                    confirmedAt: new Date(),
                })
                    .returning({ id: schema_1.payments.id })
                    .execute();
                paymentId = p.id;
            }
            await this.applyPaymentToInvoiceTx(tx, {
                companyId,
                invoiceId: issued.id,
                paymentId,
                amountAppliedMinor: dto.amountMinor,
            });
            const [finalInvoice] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, issued.id)))
                .execute();
            return { invoice: finalInvoice, paymentId };
        });
    }
    async recordBankTransfer(dto, companyId) {
        const [inv] = await this.db
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
            .execute();
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        if (inv.currency !== dto.currency)
            throw new common_1.BadRequestException('Currency mismatch');
        const [p] = await this.db
            .insert(schema_1.payments)
            .values({
            companyId,
            invoiceId: dto.invoiceId,
            method: 'bank_transfer',
            status: 'pending',
            currency: dto.currency,
            amountMinor: Math.trunc(dto.amountMinor),
            reference: dto.narration ?? null,
            meta: dto.meta ?? null,
            receivedAt: new Date(),
        })
            .returning({ id: schema_1.payments.id })
            .execute();
        return { paymentId: p.id };
    }
    async confirmBankTransferAndApply(paymentId, dto, companyId, userId) {
        return this.db.transaction(async (tx) => {
            const [p] = await tx
                .select()
                .from(schema_1.payments)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId)))
                .execute();
            if (!p)
                throw new common_1.NotFoundException('Payment not found');
            await tx
                .update(schema_1.payments)
                .set({ status: 'succeeded', confirmedAt: new Date() })
                .where((0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId))
                .execute();
            const [inv] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
                .execute();
            if (!inv)
                throw new common_1.NotFoundException('Invoice not found');
            if (inv.status === 'draft') {
                await this.invoiceService.issueInvoice(inv.id, {
                    storeId: inv.storeId ?? null,
                }, companyId, userId, { tx });
            }
            await this.applyPaymentToInvoiceTx(tx, {
                companyId: companyId,
                invoiceId: dto.invoiceId,
                paymentId: paymentId,
                amountAppliedMinor: Number(p.amountMinor),
            });
            const [finalInvoice] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
                .execute();
            return { invoice: finalInvoice };
        });
    }
    async applyPaymentToInvoiceTx(tx, dto) {
        const [inv] = await tx.execute((0, drizzle_orm_1.sql) `
        SELECT * FROM invoices
        WHERE id = ${dto.invoiceId} AND company_id = ${dto.companyId}
        FOR UPDATE
      `);
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        if (inv.status === 'void')
            throw new common_1.BadRequestException('Cannot pay a void invoice');
        const totalMinor = Number(inv.total_minor ?? 0);
        const alreadyPaid = Number(inv.paid_minor ?? 0);
        const amount = Math.max(0, Math.trunc(dto.amountAppliedMinor));
        if (amount <= 0)
            throw new common_1.BadRequestException('Payment amount must be > 0');
        const remaining = Math.max(totalMinor - alreadyPaid, 0);
        const applied = Math.min(amount, remaining);
        if (applied <= 0)
            return;
        const [existing] = await tx
            .select()
            .from(schema_1.paymentAllocations)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentAllocations.paymentId, dto.paymentId), (0, drizzle_orm_1.eq)(schema_1.paymentAllocations.invoiceId, dto.invoiceId)))
            .execute();
        if (!existing) {
            await tx
                .insert(schema_1.paymentAllocations)
                .values({
                companyId: dto.companyId,
                invoiceId: dto.invoiceId,
                paymentId: dto.paymentId,
                amountMinor: applied,
                status: 'applied',
            })
                .execute();
        }
        const newPaid = alreadyPaid + applied;
        const newBalance = Math.max(totalMinor - newPaid, 0);
        const newStatus = newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : inv.status;
        await tx
            .update(schema_1.invoices)
            .set({
            paidMinor: newPaid,
            balanceMinor: newBalance,
            status: newStatus,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId))
            .execute();
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, invoice_service_1.InvoiceService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map