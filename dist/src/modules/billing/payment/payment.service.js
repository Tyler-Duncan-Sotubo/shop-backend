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
const aws_service_1 = require("../../../common/aws/aws.service");
const invoice_service_1 = require("../invoice/invoice.service");
let PaymentService = class PaymentService {
    constructor(db, aws, invoiceService) {
        this.db = db;
        this.aws = aws;
        this.invoiceService = invoiceService;
    }
    async listPayments(companyId, filter) {
        const conditions = [(0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId)];
        if (filter.invoiceId)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.payments.invoiceId, filter.invoiceId));
        if (filter.orderId)
            conditions.push((0, drizzle_orm_1.eq)(schema_1.payments.orderId, filter.orderId));
        let query = this.db
            .select({
            id: schema_1.payments.id,
            companyId: schema_1.payments.companyId,
            orderId: schema_1.payments.orderId,
            invoiceId: schema_1.payments.invoiceId,
            method: schema_1.payments.method,
            status: schema_1.payments.status,
            currency: schema_1.payments.currency,
            amountMinor: schema_1.payments.amountMinor,
            reference: schema_1.payments.reference,
            provider: schema_1.payments.provider,
            providerRef: schema_1.payments.providerRef,
            providerEventId: schema_1.payments.providerEventId,
            receivedAt: schema_1.payments.receivedAt,
            confirmedAt: schema_1.payments.confirmedAt,
            createdByUserId: schema_1.payments.createdByUserId,
            confirmedByUserId: schema_1.payments.confirmedByUserId,
            meta: schema_1.payments.meta,
            createdAt: schema_1.payments.createdAt,
        })
            .from(schema_1.payments);
        if (filter.storeId) {
            query = query
                .innerJoin(schema_1.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.id, schema_1.payments.orderId), (0, drizzle_orm_1.eq)(schema_1.orders.companyId, schema_1.payments.companyId)))
                .where((0, drizzle_orm_1.and)(...conditions, (0, drizzle_orm_1.eq)(schema_1.orders.storeId, filter.storeId)));
        }
        else {
            query = query.where((0, drizzle_orm_1.and)(...conditions));
        }
        if (filter.limit)
            query = query.limit(filter.limit);
        if (filter.offset)
            query = query.offset(filter.offset);
        return query.execute();
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
            console.log('Requested minor amount:', requestedMinor);
            if (!Number.isFinite(requestedMinor) || requestedMinor <= 0) {
                throw new common_1.BadRequestException('Amount must be > 0');
            }
            const totalMinor = Number(inv.totalMinor ?? 0);
            const alreadyPaid = Number(inv.paidMinor ?? 0);
            const invoiceRemaining = Math.max(totalMinor - alreadyPaid, 0);
            if (invoiceRemaining <= 0)
                throw new common_1.BadRequestException('Invoice already fully paid');
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
            let orderNumber = null;
            if (inv.orderId) {
                const [ord] = await tx
                    .select({ orderNumber: schema_1.orders.orderNumber })
                    .from(schema_1.orders)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                    .execute();
                orderNumber = ord?.orderNumber ?? null;
            }
            const receipt = await this.createReceiptForPaymentTx(tx, {
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
                evidenceRow = await this.uploadPaymentEvidenceTx(tx, {
                    companyId,
                    paymentId: p.id,
                    userId,
                    dataUrl: dto.evidenceDataUrl,
                    fileName: dto.evidenceFileName,
                    note: dto.evidenceNote,
                });
            }
            await tx.insert(schema_1.paymentAllocations).values({
                companyId,
                paymentId: p.id,
                invoiceId: dto.invoiceId,
                status: 'applied',
                amountMinor: requestedMinor,
                createdByUserId: userId,
            });
            const newPaid = alreadyPaid + requestedMinor;
            const newBalance = Math.max(totalMinor - newPaid, 0);
            const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';
            if (newBalance === 0 && inv.orderId) {
                await tx
                    .update(schema_1.orders)
                    .set({
                    status: 'paid',
                    updatedAt: new Date(),
                    paidAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                    .execute();
            }
            await tx
                .update(schema_1.invoices)
                .set({
                paidMinor: newPaid,
                balanceMinor: newBalance,
                status: newStatus,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
                .execute();
            const [finalInvoice] = await tx
                .select()
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, dto.invoiceId)))
                .execute();
            return {
                invoice: finalInvoice,
                paymentId: p.id,
                receipt,
                appliedMinor: requestedMinor,
                evidence: evidenceRow,
            };
        });
    }
    async handlePaystackSuccess(dto, companyId, userId) {
        return this.db.transaction(async (tx) => {
            const provider = 'paystack';
            const providerRef = dto.providerRef;
            if (!providerRef)
                throw new common_1.BadRequestException('providerRef is required');
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
            let orderNumber = null;
            if (issuedInv?.orderId) {
                const [ord] = await tx
                    .select({ orderNumber: schema_1.orders.orderNumber })
                    .from(schema_1.orders)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, issuedInv.orderId)))
                    .execute();
                orderNumber = ord?.orderNumber ?? null;
            }
            const receipt = await this.createReceiptForPaymentTx(tx, {
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
            await this.allocatePaymentToInvoiceTx(tx, {
                companyId,
                invoiceId: issued.id,
                paymentId: p.id,
                amountMinor,
                createdByUserId: userId,
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
    async uploadPaymentEvidenceTx(tx, args) {
        const m = (args.dataUrl ?? '').match(/^data:([^;]+);base64,(.+)$/);
        if (!m)
            throw new common_1.BadRequestException('Invalid evidenceDataUrl');
        const mimeType = m[1];
        const base64 = m[2];
        const buffer = Buffer.from(base64, 'base64');
        const isPdf = mimeType === 'application/pdf';
        const isImage = mimeType.startsWith('image/');
        if (!isPdf && !isImage) {
            throw new common_1.BadRequestException('Evidence must be a PDF or image');
        }
        const ext = mimeType === 'application/pdf'
            ? 'pdf'
            : mimeType === 'image/png'
                ? 'png'
                : mimeType === 'image/webp'
                    ? 'webp'
                    : mimeType === 'image/jpeg'
                        ? 'jpg'
                        : 'bin';
        const safeName = (args.fileName?.trim() || `evidence-${Date.now()}.${ext}`).replace(/[^\w.\-() ]+/g, '_');
        const key = `companies/${args.companyId}/payments/${args.paymentId}/evidence/${safeName}`;
        const { url } = await this.aws.uploadPublicObject({
            key,
            body: buffer,
            contentType: mimeType,
        });
        const [row] = await tx
            .insert(schema_1.paymentFiles)
            .values({
            companyId: args.companyId,
            paymentId: args.paymentId,
            url,
            fileName: safeName,
            mimeType,
            sizeBytes: buffer.length,
            uploadedByUserId: args.userId,
            note: args.note ?? null,
        })
            .returning()
            .execute();
        return row;
    }
    async allocatePaymentToInvoiceTx(tx, dto) {
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
        const invoiceRemaining = Math.max(totalMinor - alreadyPaid, 0);
        const requested = Math.max(0, Math.trunc(dto.amountMinor));
        if (requested <= 0)
            throw new common_1.BadRequestException('Amount must be > 0');
        if (invoiceRemaining <= 0)
            return;
        const applied = Math.min(requested, invoiceRemaining);
        if (applied <= 0)
            return;
        await tx.insert(schema_1.paymentAllocations).values({
            companyId: dto.companyId,
            paymentId: dto.paymentId,
            invoiceId: dto.invoiceId,
            status: 'applied',
            amountMinor: applied,
            createdByUserId: dto.createdByUserId,
        });
        const newPaid = alreadyPaid + applied;
        const newBalance = Math.max(totalMinor - newPaid, 0);
        const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';
        if (newBalance === 0 && inv.orderId) {
            await tx
                .update(schema_1.orders)
                .set({
                status: 'paid',
                updatedAt: new Date(),
                paidAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, dto.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, inv.orderId)))
                .execute();
        }
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
    formatReceiptNumber(seq) {
        return `RCT-${String(seq).padStart(6, '0')}`;
    }
    async nextReceiptSequenceTx(tx, companyId) {
        const result = await tx.execute((0, drizzle_orm_1.sql) `
      SELECT *
      FROM receipt_counters
      WHERE company_id = ${companyId}
      FOR UPDATE
    `);
        const row = result?.rows?.[0] ?? null;
        if (!row) {
            await tx.insert(schema_1.receiptCounters).values({
                companyId,
                nextNumber: 2,
                updatedAt: new Date(),
            });
            return 1;
        }
        const currentNext = Number(row.next_number ?? 1);
        const seq = currentNext;
        await tx
            .update(schema_1.receiptCounters)
            .set({
            nextNumber: seq + 1,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.receiptCounters.companyId, companyId))
            .execute();
        return seq;
    }
    async createReceiptForPaymentTx(tx, args) {
        const [existing] = await tx
            .select()
            .from(schema_1.paymentReceipts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentReceipts.companyId, args.companyId), (0, drizzle_orm_1.eq)(schema_1.paymentReceipts.paymentId, args.paymentId)))
            .execute();
        if (existing)
            return existing;
        const seq = await this.nextReceiptSequenceTx(tx, args.companyId);
        const receiptNumber = this.formatReceiptNumber(seq);
        const [row] = await tx
            .insert(schema_1.paymentReceipts)
            .values({
            companyId: args.companyId,
            paymentId: args.paymentId,
            invoiceId: args.invoiceId ?? null,
            orderId: args.orderId ?? null,
            invoiceNumber: args.invoiceNumber ?? null,
            orderNumber: args.orderNumber ?? null,
            sequenceNumber: seq,
            receiptNumber,
            currency: args.currency,
            amountMinor: args.amountMinor,
            method: args.method,
            reference: args.reference ?? null,
            customerSnapshot: args.customerSnapshot ?? null,
            storeSnapshot: args.storeSnapshot ?? null,
            meta: args.meta ?? null,
            issuedAt: new Date(),
            createdByUserId: args.createdByUserId ?? null,
        })
            .returning()
            .execute();
        return row;
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        invoice_service_1.InvoiceService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map