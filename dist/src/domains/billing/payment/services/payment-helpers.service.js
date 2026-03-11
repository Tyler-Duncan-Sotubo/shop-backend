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
exports.PaymentHelpersService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const aws_service_1 = require("../../../../infrastructure/aws/aws.service");
const id_1 = require("../../../../infrastructure/drizzle/id");
let PaymentHelpersService = class PaymentHelpersService {
    constructor(db, aws) {
        this.db = db;
        this.aws = aws;
    }
    sanitizeFileName(name) {
        return (name || 'upload')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .slice(0, 120);
    }
    assertEvidenceMime(mimeType) {
        const mt = (mimeType || '').toLowerCase();
        const isPdf = mt === 'application/pdf';
        const isImage = mt.startsWith('image/');
        if (!isPdf && !isImage) {
            throw new common_1.BadRequestException('Evidence must be a PDF or image');
        }
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
        const { invoicesTable } = dto;
        const result = await tx.execute((0, drizzle_orm_1.sql) `
        SELECT * FROM invoices
        WHERE id = ${dto.invoiceId} AND company_id = ${dto.companyId}
        FOR UPDATE
      `);
        const inv = result?.rows?.[0] ?? null;
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
        const orderId = inv.order_id ?? inv.orderId ?? null;
        if (newBalance === 0 && orderId) {
            await tx
                .update(schema_1.orders)
                .set({
                status: 'paid',
                updatedAt: new Date(),
                paidAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, dto.companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
                .execute();
        }
        await tx
            .update(invoicesTable)
            .set({
            paidMinor: newPaid,
            balanceMinor: newBalance,
            status: newStatus,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(invoicesTable.id, dto.invoiceId))
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
    async getOrderNumberTx(tx, companyId, orderId) {
        if (!orderId)
            return null;
        const [ord] = await tx
            .select({ orderNumber: schema_1.orders.orderNumber })
            .from(schema_1.orders)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, orderId)))
            .execute();
        return ord?.orderNumber ?? null;
    }
    async presignPaymentEvidenceUpload(params) {
        const { companyId, paymentId, fileName, mimeType, expiresInSeconds = 300, publicRead = true, requirePendingBankTransfer = false, paymentsTable, } = params;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (!paymentId)
            throw new common_1.BadRequestException('paymentId is required');
        if (!fileName)
            throw new common_1.BadRequestException('fileName is required');
        const mt = (mimeType || 'application/octet-stream').trim();
        this.assertEvidenceMime(mt);
        const [p] = await this.db
            .select({
            id: paymentsTable.id,
            method: paymentsTable.method,
            status: paymentsTable.status,
        })
            .from(paymentsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(paymentsTable.companyId, companyId), (0, drizzle_orm_1.eq)(paymentsTable.id, paymentId)))
            .execute();
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        if (requirePendingBankTransfer) {
            if (p.method !== 'bank_transfer') {
                throw new common_1.BadRequestException('Payment is not a bank transfer');
            }
            if (p.status !== 'pending') {
                throw new common_1.BadRequestException('Evidence can only be uploaded for pending payments');
            }
        }
        const cleanName = this.sanitizeFileName(fileName);
        const extFromMime = mt.includes('/')
            ? `.${mt.split('/')[1] || 'bin'}`
            : '.bin';
        const finalName = cleanName.includes('.')
            ? cleanName
            : `${cleanName}${extFromMime}`;
        const key = `companies/${companyId}/payments/${paymentId}/evidence/tmp/${(0, id_1.defaultId)()}-${finalName}`;
        const presign = await this.aws.createPresignedPutUrl({
            key,
            contentType: mt,
            expiresInSeconds,
            publicRead,
        });
        return {
            upload: {
                ...presign,
                key,
                fileName: finalName,
                mimeType: mt,
            },
        };
    }
    async finalizePaymentEvidenceUpload(params) {
        const { companyId, paymentId, key, url, fileName, mimeType, note, uploadedByUserId, requirePendingBankTransfer = false, paymentsTable, } = params;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (!paymentId)
            throw new common_1.BadRequestException('paymentId is required');
        if (!key?.trim())
            throw new common_1.BadRequestException('key is required');
        const [p] = await this.db
            .select({
            id: paymentsTable.id,
            method: paymentsTable.method,
            status: paymentsTable.status,
        })
            .from(paymentsTable)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(paymentsTable.companyId, companyId), (0, drizzle_orm_1.eq)(paymentsTable.id, paymentId)))
            .execute();
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        if (requirePendingBankTransfer) {
            if (p.method !== 'bank_transfer') {
                throw new common_1.BadRequestException('Payment is not a bank transfer');
            }
            if (p.status !== 'pending') {
                throw new common_1.BadRequestException('Evidence can only be uploaded for pending payments');
            }
        }
        let head;
        try {
            head = await this.aws.headObject(key);
        }
        catch {
            throw new common_1.BadRequestException('Uploaded object not found in storage');
        }
        const finalMime = (mimeType ?? head.contentType ?? 'application/octet-stream').trim() ||
            'application/octet-stream';
        this.assertEvidenceMime(finalMime);
        const sizeBytes = typeof head.contentLength === 'number' ? head.contentLength : null;
        const safeName = this.sanitizeFileName(fileName ?? key.split('/').pop() ?? 'evidence');
        const finalUrl = url?.trim() || this.aws.publicUrlForKey(key);
        const [row] = await this.db
            .insert(schema_1.paymentFiles)
            .values({
            companyId,
            paymentId,
            url: finalUrl,
            fileName: safeName,
            mimeType: finalMime,
            sizeBytes: sizeBytes,
            uploadedByUserId: uploadedByUserId ?? null,
            note: note ?? null,
        })
            .returning()
            .execute();
        return row;
    }
    async getPaymentEvidence(companyId, paymentId) {
        return this.db
            .select()
            .from(schema_1.paymentFiles)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentFiles.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentFiles.paymentId, paymentId)))
            .execute();
    }
};
exports.PaymentHelpersService = PaymentHelpersService;
exports.PaymentHelpersService = PaymentHelpersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService])
], PaymentHelpersService);
//# sourceMappingURL=payment-helpers.service.js.map