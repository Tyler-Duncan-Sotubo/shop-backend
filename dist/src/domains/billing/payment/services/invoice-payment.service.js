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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicePaymentService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const invoice_service_1 = require("../../invoice/invoice.service");
const payment_helpers_service_1 = require("./payment-helpers.service");
let InvoicePaymentService = class InvoicePaymentService {
    constructor(db, invoiceService, helpers) {
        this.db = db;
        this.invoiceService = invoiceService;
        this.helpers = helpers;
    }
    async recordInvoicePayment(dto, companyId, userId) {
        return this.db.transaction(async (tx) => {
            const [inv] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
                .execute();
            if (!inv)
                throw new common_1.NotFoundException('Invoice not found');
            if (inv.status === 'void')
                throw new common_1.BadRequestException('Cannot pay a void invoice');
            const currency = dto.currency.toUpperCase();
            if (inv.currency !== currency)
                throw new common_1.BadRequestException('Currency mismatch');
            if (inv.status === 'draft')
                throw new common_1.BadRequestException('Issue invoice before recording payment');
            const requestedMinor = Math.round(Number(dto.amount) * 100);
            if (!Number.isFinite(requestedMinor) || requestedMinor <= 0) {
                throw new common_1.BadRequestException('Amount must be > 0');
            }
            const totalMinor = Number(inv.totalMinor ?? 0);
            const alreadyPaid = Number(inv.paidMinor ?? 0);
            const invoiceRemaining = Math.max(totalMinor - alreadyPaid, 0);
            if (invoiceRemaining <= 0) {
                throw new common_1.BadRequestException('Invoice already fully paid');
            }
            if (requestedMinor > invoiceRemaining) {
                throw new common_1.BadRequestException(`Amount exceeds invoice balance (${invoiceRemaining}).`);
            }
            const [p] = await tx
                .insert(schema_1.payments)
                .values({
                companyId,
                orderId: inv.orderId ?? null,
                invoiceId: dto.invoiceId,
                method: dto.method,
                status: 'succeeded',
                currency,
                amountMinor: requestedMinor,
                reference: dto.reference ?? null,
                meta: dto.meta ?? null,
                receivedAt: new Date(),
                confirmedAt: new Date(),
                createdByUserId: userId,
                confirmedByUserId: userId,
            })
                .returning({ id: schema_1.payments.id })
                .execute();
            const orderNumber = await this.helpers.getOrderNumberTx(tx, companyId, inv.orderId ?? null);
            const receipt = await this.helpers.createReceiptForPaymentTx(tx, {
                companyId,
                paymentId: p.id,
                invoiceId: dto.invoiceId,
                orderId: inv.orderId ?? null,
                invoiceNumber: inv.number ?? null,
                orderNumber,
                currency,
                amountMinor: requestedMinor,
                method: dto.method,
                reference: dto.reference ?? null,
                customerSnapshot: inv.customerSnapshot ?? null,
                storeSnapshot: inv.supplierSnapshot ?? null,
                meta: dto.meta ?? null,
                createdByUserId: userId,
            });
            let evidenceRow = null;
            if (dto.evidenceDataUrl) {
                evidenceRow = await this.helpers.uploadPaymentEvidenceTx(tx, {
                    companyId,
                    paymentId: p.id,
                    userId,
                    dataUrl: dto.evidenceDataUrl,
                    fileName: dto.evidenceFileName,
                    note: dto.evidenceNote,
                });
            }
            await this.helpers.allocatePaymentToInvoiceTx(tx, {
                companyId,
                invoiceId: dto.invoiceId,
                paymentId: p.id,
                amountMinor: requestedMinor,
                createdByUserId: userId,
                invoicesTable: schema_1.invoices,
            });
            const [finalInvoice] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
                .execute();
            return {
                invoice: finalInvoice,
                paymentId: p.id,
                receipt,
                receiptId: receipt.id,
                appliedMinor: requestedMinor,
                evidence: evidenceRow,
            };
        });
    }
    async finalizePendingBankTransferPayment(dto, companyId, userId) {
        return this.db.transaction(async (tx) => {
            const payRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT * FROM payments
          WHERE id = ${dto.paymentId} AND company_id = ${companyId}
          FOR UPDATE
        `);
            const p = payRes?.rows?.[0] ?? null;
            if (!p)
                throw new common_1.NotFoundException('Payment not found');
            if (p.status === 'succeeded') {
                const [existingReceipt] = await tx
                    .select()
                    .from(schema_1.paymentReceipts)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentReceipts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentReceipts.paymentId, p.id)))
                    .execute();
                return {
                    paymentId: p.id,
                    receipt: existingReceipt ?? null,
                    alreadyConfirmed: true,
                };
            }
            if (p.method !== 'bank_transfer') {
                throw new common_1.BadRequestException('Payment is not a bank transfer');
            }
            if (p.status !== 'pending') {
                throw new common_1.BadRequestException(`Payment must be pending (got ${p.status})`);
            }
            const invoiceId = p.invoice_id ?? null;
            if (!invoiceId) {
                throw new common_1.BadRequestException('Payment is missing invoiceId');
            }
            const invRes = await tx.execute((0, drizzle_orm_1.sql) `
          SELECT * FROM invoices
          WHERE id = ${invoiceId} AND company_id = ${companyId}
          FOR UPDATE
        `);
            const inv = invRes?.rows?.[0] ?? null;
            if (!inv)
                throw new common_1.NotFoundException('Invoice not found');
            if (inv.status === 'void') {
                throw new common_1.BadRequestException('Cannot confirm payment for a void invoice');
            }
            if (inv.status === 'draft') {
                const issued = await this.invoiceService.issueInvoice(inv.id, { storeId: inv.store_id ?? null }, companyId, userId, { tx });
                inv.number = issued.number;
                inv.status = issued.status;
            }
            if (dto.evidenceDataUrl) {
                await this.helpers.uploadPaymentEvidenceTx(tx, {
                    companyId,
                    paymentId: p.id,
                    userId,
                    dataUrl: dto.evidenceDataUrl,
                    fileName: dto.evidenceFileName,
                    note: dto.evidenceNote,
                });
            }
            const paymentAmountMinor = Math.trunc(Number(p.amount_minor ?? 0));
            if (!Number.isFinite(paymentAmountMinor) || paymentAmountMinor <= 0) {
                throw new common_1.BadRequestException('Payment amountMinor is invalid');
            }
            const appliedMinor = dto.amountMinorOverride !== undefined &&
                dto.amountMinorOverride !== null
                ? Math.trunc(Number(dto.amountMinorOverride))
                : paymentAmountMinor;
            if (!Number.isFinite(appliedMinor) || appliedMinor <= 0) {
                throw new common_1.BadRequestException('amountMinorOverride is invalid');
            }
            if (appliedMinor > paymentAmountMinor) {
                throw new common_1.BadRequestException('amountMinorOverride cannot exceed payment amount');
            }
            await tx
                .update(schema_1.payments)
                .set({
                status: 'succeeded',
                reference: dto.reference !== undefined ? dto.reference : (p.reference ?? null),
                receivedAt: new Date(),
                confirmedAt: new Date(),
                confirmedByUserId: userId,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.payments.id, p.id))
                .execute();
            await this.helpers.allocatePaymentToInvoiceTx(tx, {
                companyId,
                invoiceId: inv.id,
                paymentId: p.id,
                amountMinor: appliedMinor,
                createdByUserId: userId,
                invoicesTable: schema_1.invoices,
            });
            const orderId = inv.order_id ?? null;
            const orderNumber = await this.helpers.getOrderNumberTx(tx, companyId, orderId);
            const receipt = await this.helpers.createReceiptForPaymentTx(tx, {
                companyId,
                paymentId: p.id,
                invoiceId: inv.id,
                orderId,
                invoiceNumber: inv.number ?? null,
                orderNumber,
                currency: p.currency ?? inv.currency ?? 'NGN',
                amountMinor: appliedMinor,
                method: 'bank_transfer',
                reference: dto.reference ?? p.reference ?? null,
                customerSnapshot: inv.customer_snapshot ?? null,
                storeSnapshot: inv.supplier_snapshot ?? null,
                meta: p.meta ?? null,
                createdByUserId: userId,
            });
            return {
                paymentId: p.id,
                receiptId: receipt.id,
                receipt,
                alreadyConfirmed: false,
            };
        });
    }
    async handlePaystackSuccess(dto, companyId, userId) {
        return this.db.transaction(async (tx) => {
            const provider = 'paystack';
            const providerRef = dto.providerRef;
            if (!providerRef) {
                throw new common_1.BadRequestException('providerRef is required');
            }
            const [existingEvent] = await tx
                .select()
                .from(schema_1.paymentProviderEvents)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentProviderEvents.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentProviderEvents.provider, provider), (0, drizzle_orm_1.eq)(schema_1.paymentProviderEvents.providerRef, providerRef)))
                .execute();
            if (existingEvent?.paymentId) {
                return { paymentId: existingEvent.paymentId, alreadyProcessed: true };
            }
            const [evt] = existingEvent
                ? [existingEvent]
                : await tx
                    .insert(schema_1.paymentProviderEvents)
                    .values({
                    companyId,
                    provider,
                    providerRef,
                    providerEventId: dto.providerEventId ?? null,
                    payload: dto.meta ?? null,
                })
                    .returning()
                    .execute();
            const inv = await this.invoiceService.createDraftFromOrder({
                orderId: dto.orderId,
                storeId: dto.storeId ?? null,
                currency: dto.currency,
                type: 'invoice',
            }, companyId, { tx });
            const issued = await this.invoiceService.issueInvoice(inv.id, { storeId: inv.storeId ?? null }, companyId, userId, { tx });
            const amountMinor = Math.trunc(Number(dto.amountMinor));
            if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
                throw new common_1.BadRequestException('Invalid amountMinor');
            }
            const [p] = await tx
                .insert(schema_1.payments)
                .values({
                companyId,
                method: 'gateway',
                status: 'succeeded',
                currency: dto.currency,
                amountMinor,
                reference: providerRef,
                meta: dto.meta ?? null,
                receivedAt: new Date(),
                confirmedAt: new Date(),
                createdByUserId: userId,
                confirmedByUserId: userId,
            })
                .returning({ id: schema_1.payments.id })
                .execute();
            const [issuedInv] = await tx
                .select({
                id: schema_1.invoices.id,
                number: schema_1.invoices.number,
                orderId: schema_1.invoices.orderId,
            })
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, issued.id)))
                .execute();
            const orderNumber = await this.helpers.getOrderNumberTx(tx, companyId, issuedInv?.orderId ?? null);
            const receipt = await this.helpers.createReceiptForPaymentTx(tx, {
                companyId,
                paymentId: p.id,
                invoiceId: issuedInv?.id ?? null,
                orderId: issuedInv?.orderId ?? null,
                invoiceNumber: issuedInv?.number ?? null,
                orderNumber,
                currency: dto.currency,
                amountMinor,
                method: 'gateway',
                reference: providerRef,
                meta: dto.meta ?? null,
                createdByUserId: userId,
            });
            await tx
                .update(schema_1.paymentProviderEvents)
                .set({ paymentId: p.id })
                .where((0, drizzle_orm_1.eq)(schema_1.paymentProviderEvents.id, evt.id))
                .execute();
            await this.helpers.allocatePaymentToInvoiceTx(tx, {
                companyId,
                invoiceId: issued.id,
                paymentId: p.id,
                amountMinor,
                createdByUserId: userId,
                invoicesTable: schema_1.invoices,
            });
            const [finalInvoice] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, issued.id)))
                .execute();
            return {
                invoice: finalInvoice,
                paymentId: p.id,
                receipt,
                alreadyProcessed: false,
            };
        });
    }
};
exports.InvoicePaymentService = InvoicePaymentService;
exports.InvoicePaymentService = InvoicePaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, invoice_service_1.InvoiceService, typeof (_a = typeof payment_helpers_service_1.PaymentHelpersService !== "undefined" && payment_helpers_service_1.PaymentHelpersService) === "function" ? _a : Object])
], InvoicePaymentService);
//# sourceMappingURL=invoice-payment.service.js.map