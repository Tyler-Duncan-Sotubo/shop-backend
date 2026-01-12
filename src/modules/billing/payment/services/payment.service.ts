// src/modules/billing/payments/services/payment.service.ts
import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import {
  invoices,
  payments,
  paymentAllocations,
  paymentFiles,
  paymentProviderEvents,
  orders,
  paymentReceipts,
  receiptCounters,
} from 'src/drizzle/schema';
import { AwsService } from 'src/common/aws/aws.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { PaystackSuccessDto } from '../dto/paystack-success.dto';
import { ListPaymentsQueryDto } from '../dto/payment-list.dto';
import { FinalizeBankTransferPaymentDto } from '../dto/finalize-bank-transfer.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly aws: AwsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // Get Payments, List Payments, etc. can be added here

  async listPayments(companyId: string, filter: ListPaymentsQueryDto) {
    const conditions = [eq(payments.companyId, companyId)];

    if (filter.invoiceId)
      conditions.push(eq(payments.invoiceId, filter.invoiceId));
    if (filter.orderId) conditions.push(eq(payments.orderId, filter.orderId));

    // ✅ select ONLY payment fields so result is Payment[]
    let query = this.db
      .select({
        id: payments.id,
        companyId: payments.companyId,
        orderId: payments.orderId,
        invoiceId: payments.invoiceId,
        method: payments.method,
        status: payments.status,
        currency: payments.currency,
        amountMinor: payments.amountMinor,
        reference: payments.reference,
        provider: payments.provider,
        providerRef: payments.providerRef,
        providerEventId: payments.providerEventId,
        receivedAt: payments.receivedAt,
        confirmedAt: payments.confirmedAt,
        createdByUserId: payments.createdByUserId,
        confirmedByUserId: payments.confirmedByUserId,
        meta: payments.meta,
        createdAt: payments.createdAt,
      })
      .from(payments);

    if (filter.storeId) {
      query = query
        .innerJoin(
          orders,
          and(
            eq(orders.id, payments.orderId),
            eq(orders.companyId, payments.companyId),
          ),
        )
        // ✅ store filter MUST be in WHERE
        .where(and(...conditions, eq(orders.storeId, filter.storeId))) as any;
    } else {
      query = query.where(and(...conditions)) as any;
    }

    if (filter.limit) query = query.limit(filter.limit) as any;
    if (filter.offset) query = query.offset(filter.offset) as any;

    return query.execute(); // ✅ Payment[]
  }

  /**
   * Stripe/Zoho-style: record a (manual) payment against an invoice (partial supported).
   * Also optionally attaches evidence (PDF/image) in the same call.
   */
  async recordInvoicePayment(
    dto: {
      invoiceId: string;
      amount: number; // MAJOR
      currency: string;
      method: 'bank_transfer' | 'cash' | 'card_manual' | 'other';
      reference?: string | null;
      meta?: any;

      evidenceDataUrl?: string;
      evidenceFileName?: string;
      evidenceNote?: string;
    },
    companyId: string,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      // 1) Lock invoice
      const [inv] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, dto.invoiceId),
          ),
        )
        .execute();

      if (!inv) throw new NotFoundException('Invoice not found');
      if (inv.status === 'void')
        throw new BadRequestException('Cannot pay a void invoice');

      const currency = dto.currency.toUpperCase();
      if (inv.currency !== currency)
        throw new BadRequestException('Currency mismatch');

      if (inv.status === 'draft')
        throw new BadRequestException('Issue invoice before recording payment');

      // 2) Convert major -> minor
      const requestedMinor = Math.round(Number(dto.amount) * 100);
      console.log('Requested minor amount:', requestedMinor);
      if (!Number.isFinite(requestedMinor) || requestedMinor <= 0) {
        throw new BadRequestException('Amount must be > 0');
      }

      const totalMinor = Number(inv.totalMinor ?? 0);
      const alreadyPaid = Number(inv.paidMinor ?? 0);
      const invoiceRemaining = Math.max(totalMinor - alreadyPaid, 0);
      if (invoiceRemaining <= 0)
        throw new BadRequestException('Invoice already fully paid');

      // Keep it simple: no overpay/credit yet
      if (requestedMinor > invoiceRemaining) {
        throw new BadRequestException(
          `Amount exceeds invoice balance (${invoiceRemaining}).`,
        );
      }

      // 3) Create payment (succeeded immediately)
      const [p] = await tx
        .insert(payments)
        .values({
          companyId,
          orderId: inv.orderId ?? null,
          invoiceId: dto.invoiceId,
          method: dto.method as any,
          status: 'succeeded',
          currency,
          amountMinor: requestedMinor,
          reference: dto.reference ?? null,
          meta: dto.meta ?? null,
          receivedAt: new Date(),
          confirmedAt: new Date(),
          createdByUserId: userId,
          confirmedByUserId: userId,
        } as any)
        .returning({ id: payments.id })
        .execute();

      // fetch orderNumber (optional, only if order exists)
      let orderNumber: string | null = null;
      if (inv.orderId) {
        const [ord] = await tx
          .select({ orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(eq(orders.companyId, companyId), eq(orders.id, inv.orderId)),
          )
          .execute();

        orderNumber = ord?.orderNumber ?? null;
      }

      const receipt = await this.createReceiptForPaymentTx(tx, {
        companyId,
        paymentId: p.id,

        invoiceId: dto.invoiceId,
        orderId: inv.orderId ?? null,

        invoiceNumber: (inv as any).number ?? null,
        orderNumber,

        currency,
        amountMinor: requestedMinor,
        method: dto.method,
        reference: dto.reference ?? null,

        customerSnapshot: (inv as any).customerSnapshot ?? null,
        storeSnapshot: (inv as any).supplierSnapshot ?? null, // or store snapshot you prefer
        meta: dto.meta ?? null,

        createdByUserId: userId,
      });

      // 4) Optional evidence upload + normalized write
      let evidenceRow: any | null = null;
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

      // 5) Allocation (append-only ledger)
      await tx.insert(paymentAllocations).values({
        companyId,
        paymentId: p.id,
        invoiceId: dto.invoiceId,
        status: 'applied',
        amountMinor: requestedMinor,
        createdByUserId: userId,
      } as any);

      // 6) Update invoice totals/status
      const newPaid = alreadyPaid + requestedMinor;
      const newBalance = Math.max(totalMinor - newPaid, 0);
      const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';

      if (newBalance === 0 && inv.orderId) {
        await tx
          .update(orders)
          .set({
            status: 'paid',
            updatedAt: new Date(),
            paidAt: new Date(),
          } as any)
          .where(
            and(eq(orders.companyId, companyId), eq(orders.id, inv.orderId)),
          )
          .execute();
      }

      await tx
        .update(invoices)
        .set({
          paidMinor: newPaid,
          balanceMinor: newBalance,
          status: newStatus,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, dto.invoiceId),
          ),
        )
        .execute();

      const [finalInvoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, dto.invoiceId),
          ),
        )
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

  /**
   * Gateway success (Paystack) with normalized provider events:
   * idempotent via payment_provider_events(companyId, provider, providerRef)
   */
  async handlePaystackSuccess(
    dto: PaystackSuccessDto,
    companyId: string,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const provider = 'paystack';
      const providerRef = dto.providerRef;

      if (!providerRef)
        throw new BadRequestException('providerRef is required');

      // Idempotency
      const [existingEvent] = await tx
        .select()
        .from(paymentProviderEvents)
        .where(
          and(
            eq(paymentProviderEvents.companyId, companyId),
            eq(paymentProviderEvents.provider, provider),
            eq(paymentProviderEvents.providerRef, providerRef),
          ),
        )
        .execute();

      if (existingEvent?.paymentId) {
        return { paymentId: existingEvent.paymentId, alreadyProcessed: true };
      }

      const [evt] = existingEvent
        ? [existingEvent]
        : await tx
            .insert(paymentProviderEvents)
            .values({
              companyId,
              provider,
              providerRef,
              providerEventId: (dto as any).providerEventId ?? null,
              payload: dto.meta ?? null,
            } as any)
            .returning()
            .execute();

      // Create draft invoice + issue (your current behavior)
      const inv = await this.invoiceService.createDraftFromOrder(
        {
          orderId: dto.orderId,
          storeId: dto.storeId ?? null,
          currency: dto.currency,
          type: 'invoice',
        } as any,
        companyId,
        { tx },
      );

      const issued = await this.invoiceService.issueInvoice(
        inv.id,
        { storeId: inv.storeId ?? null },
        companyId,
        userId,
        { tx },
      );

      const amountMinor = Math.trunc(Number(dto.amountMinor));
      if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
        throw new BadRequestException('Invalid amountMinor');
      }

      const [p] = await tx
        .insert(payments)
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
        } as any)
        .returning({ id: payments.id })
        .execute();

      // fetch invoice number (issued invoice should have number)
      const [issuedInv] = await tx
        .select({
          id: invoices.id,
          number: invoices.number,
          orderId: invoices.orderId,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, (issued as any).id),
          ),
        )
        .execute();

      let orderNumber: string | null = null;
      if (issuedInv?.orderId) {
        const [ord] = await tx
          .select({ orderNumber: orders.orderNumber })
          .from(orders)
          .where(
            and(
              eq(orders.companyId, companyId),
              eq(orders.id, issuedInv.orderId),
            ),
          )
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
        .update(paymentProviderEvents)
        .set({ paymentId: p.id } as any)
        .where(eq(paymentProviderEvents.id, evt.id))
        .execute();

      await this.allocatePaymentToInvoiceTx(tx, {
        companyId,
        invoiceId: (issued as any).id,
        paymentId: p.id,
        amountMinor,
        createdByUserId: userId,
      });

      const [finalInvoice] = await tx
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, (issued as any).id),
          ),
        )
        .execute();

      return {
        invoice: finalInvoice,
        paymentId: p.id,
        receipt,
        alreadyProcessed: false,
      };
    });
  }

  // ----------------------------
  // Private helpers
  // ----------------------------

  private async uploadPaymentEvidenceTx(
    tx: any,
    args: {
      companyId: string;
      paymentId: string;
      userId: string;
      dataUrl: string;
      fileName?: string;
      note?: string;
    },
  ) {
    const m = (args.dataUrl ?? '').match(/^data:([^;]+);base64,(.+)$/);
    if (!m) throw new BadRequestException('Invalid evidenceDataUrl');

    const mimeType = m[1];
    const base64 = m[2];
    const buffer = Buffer.from(base64, 'base64');

    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    if (!isPdf && !isImage) {
      throw new BadRequestException('Evidence must be a PDF or image');
    }

    const ext =
      mimeType === 'application/pdf'
        ? 'pdf'
        : mimeType === 'image/png'
          ? 'png'
          : mimeType === 'image/webp'
            ? 'webp'
            : mimeType === 'image/jpeg'
              ? 'jpg'
              : 'bin';

    const safeName = (
      args.fileName?.trim() || `evidence-${Date.now()}.${ext}`
    ).replace(/[^\w.\-() ]+/g, '_');

    const key = `companies/${args.companyId}/payments/${args.paymentId}/evidence/${safeName}`;

    const { url } = await this.aws.uploadPublicObject({
      key,
      body: buffer,
      contentType: mimeType,
    });

    // Insert into normalized table
    const [row] = await tx
      .insert(paymentFiles)
      .values({
        companyId: args.companyId,
        paymentId: args.paymentId,
        url,
        fileName: safeName,
        mimeType,
        sizeBytes: buffer.length,
        uploadedByUserId: args.userId,
        note: args.note ?? null, // remove if your schema doesn't have note
      } as any)
      .returning()
      .execute();

    return row;
  }

  private async allocatePaymentToInvoiceTx(
    tx: any,
    dto: {
      companyId: string;
      invoiceId: string;
      paymentId: string;
      amountMinor: number;
      createdByUserId: string;
    },
  ) {
    const [inv] = await tx.execute(
      sql`
        SELECT * FROM invoices
        WHERE id = ${dto.invoiceId} AND company_id = ${dto.companyId}
        FOR UPDATE
      ` as any,
    );

    if (!inv) throw new NotFoundException('Invoice not found');
    if (inv.status === 'void')
      throw new BadRequestException('Cannot pay a void invoice');

    const totalMinor = Number(inv.total_minor ?? 0);
    const alreadyPaid = Number(inv.paid_minor ?? 0);
    const invoiceRemaining = Math.max(totalMinor - alreadyPaid, 0);

    const requested = Math.max(0, Math.trunc(dto.amountMinor));
    if (requested <= 0) throw new BadRequestException('Amount must be > 0');
    if (invoiceRemaining <= 0) return;

    const applied = Math.min(requested, invoiceRemaining);
    if (applied <= 0) return;

    await tx.insert(paymentAllocations).values({
      companyId: dto.companyId,
      paymentId: dto.paymentId,
      invoiceId: dto.invoiceId,
      status: 'applied',
      amountMinor: applied,
      createdByUserId: dto.createdByUserId,
    } as any);

    const newPaid = alreadyPaid + applied;
    const newBalance = Math.max(totalMinor - newPaid, 0);
    const newStatus = newBalance === 0 ? 'paid' : 'partially_paid';

    if (newBalance === 0 && inv.orderId) {
      await tx
        .update(orders)
        .set({
          status: 'paid', // or status: 'paid' depending on your schema
          updatedAt: new Date(), // optional if you have it
          paidAt: new Date(),
        } as any)
        .where(
          and(eq(orders.companyId, dto.companyId), eq(orders.id, inv.orderId)),
        )
        .execute();
    }

    await tx
      .update(invoices)
      .set({
        paidMinor: newPaid,
        balanceMinor: newBalance,
        status: newStatus,
        updatedAt: new Date(),
      } as any)
      .where(eq(invoices.id, dto.invoiceId))
      .execute();
  }

  private formatReceiptNumber(seq: number) {
    return `RCT-${String(seq).padStart(6, '0')}`;
  }

  private async nextReceiptSequenceTx(tx: any, companyId: string) {
    const result = await tx.execute(
      sql`
      SELECT *
      FROM receipt_counters
      WHERE company_id = ${companyId}
      FOR UPDATE
    `,
    );

    const row = (result as any)?.rows?.[0] ?? null;

    if (!row) {
      await tx.insert(receiptCounters).values({
        companyId,
        nextNumber: 2,
        updatedAt: new Date(),
      } as any);

      return 1;
    }

    const currentNext = Number(row.next_number ?? 1);
    const seq = currentNext;

    await tx
      .update(receiptCounters)
      .set({
        nextNumber: seq + 1,
        updatedAt: new Date(),
      } as any)
      .where(eq(receiptCounters.companyId, companyId))
      .execute();

    return seq;
  }

  private async createReceiptForPaymentTx(
    tx: any,
    args: {
      companyId: string;
      paymentId: string;

      invoiceId?: string | null;
      orderId?: string | null;

      invoiceNumber?: string | null;
      orderNumber?: string | null;

      currency: string;
      amountMinor: number;
      method: any;
      reference?: string | null;

      customerSnapshot?: any;
      storeSnapshot?: any;
      meta?: any;

      createdByUserId?: string | null;
    },
  ) {
    // idempotency: already exists
    const [existing] = await tx
      .select()
      .from(paymentReceipts)
      .where(
        and(
          eq(paymentReceipts.companyId, args.companyId),
          eq(paymentReceipts.paymentId, args.paymentId),
        ),
      )
      .execute();

    if (existing) return existing;

    const seq = await this.nextReceiptSequenceTx(tx, args.companyId);
    const receiptNumber = this.formatReceiptNumber(seq);

    const [row] = await tx
      .insert(paymentReceipts)
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
      } as any)
      .returning()
      .execute();

    return row;
  }

  // in PaymentService

  // PaymentService

  async finalizePendingBankTransferPayment(
    dto: FinalizeBankTransferPaymentDto,
    companyId: string,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      // 1) lock payment
      const payRes = await tx.execute(
        sql`
        SELECT * FROM payments
        WHERE id = ${dto.paymentId} AND company_id = ${companyId}
        FOR UPDATE
      ` as any,
      );
      const p = (payRes as any)?.rows?.[0] ?? null;
      if (!p) throw new NotFoundException('Payment not found');

      // idempotent: already finalized
      if (p.status === 'succeeded') {
        const [existingReceipt] = await tx
          .select()
          .from(paymentReceipts)
          .where(
            and(
              eq(paymentReceipts.companyId, companyId),
              eq(paymentReceipts.paymentId, p.id),
            ),
          )
          .execute();

        return {
          paymentId: p.id,
          receipt: existingReceipt ?? null,
          alreadyConfirmed: true,
        };
      }

      if (p.method !== 'bank_transfer') {
        throw new BadRequestException('Payment is not a bank transfer');
      }
      if (p.status !== 'pending') {
        throw new BadRequestException(
          `Payment must be pending (got ${p.status})`,
        );
      }

      // 2) invoice must exist in your flow (checkout creates draft invoice)
      const invoiceId = p.invoice_id ?? null;
      if (!invoiceId) {
        throw new BadRequestException('Payment is missing invoiceId');
      }

      // lock invoice row early (prevents race with other confirmations)
      const invRes = await tx.execute(
        sql`
        SELECT * FROM invoices
        WHERE id = ${invoiceId} AND company_id = ${companyId}
        FOR UPDATE
      ` as any,
      );
      const inv = (invRes as any)?.rows?.[0] ?? null;
      if (!inv) throw new NotFoundException('Invoice not found');

      if (inv.status === 'void') {
        throw new BadRequestException(
          'Cannot confirm payment for a void invoice',
        );
      }
      if (inv.status === 'draft') {
        // You can decide policy:
        // Option A: issue invoice automatically on confirmation
        // Option B: require invoice to be issued before confirming
        //
        // For checkout, I recommend issuing when confirming bank transfer:
        const issued = await this.invoiceService.issueInvoice(
          inv.id,
          { storeId: inv.store_id ?? null },
          companyId,
          userId,
          { tx },
        );
        // refresh inv view
        (inv as any).number = (issued as any).number;
        (inv as any).status = (issued as any).status;
      }

      // 3) optional evidence upload
      if (dto.evidenceDataUrl) {
        await this.uploadPaymentEvidenceTx(tx, {
          companyId,
          paymentId: p.id,
          userId,
          dataUrl: dto.evidenceDataUrl,
          fileName: dto.evidenceFileName,
          note: dto.evidenceNote,
        });
      }

      // 4) decide applied amount (full vs override)
      const paymentAmountMinor = Math.trunc(Number(p.amount_minor ?? 0));
      if (!Number.isFinite(paymentAmountMinor) || paymentAmountMinor <= 0) {
        throw new BadRequestException('Payment amountMinor is invalid');
      }

      const appliedMinor =
        dto.amountMinorOverride !== undefined &&
        dto.amountMinorOverride !== null
          ? Math.trunc(Number(dto.amountMinorOverride))
          : paymentAmountMinor;

      if (!Number.isFinite(appliedMinor) || appliedMinor <= 0) {
        throw new BadRequestException('amountMinorOverride is invalid');
      }
      if (appliedMinor > paymentAmountMinor) {
        throw new BadRequestException(
          'amountMinorOverride cannot exceed payment amount',
        );
      }

      // 5) mark payment succeeded
      await tx
        .update(payments)
        .set({
          status: 'succeeded',
          reference:
            dto.reference !== undefined ? dto.reference : (p.reference ?? null),
          receivedAt: new Date(),
          confirmedAt: new Date(),
          confirmedByUserId: userId,
          updatedAt: new Date(), // if you have it; otherwise remove
        } as any)
        .where(eq(payments.id, p.id))
        .execute();

      // 6) allocate to invoice (this updates invoice + may mark order paid)
      await this.allocatePaymentToInvoiceTx(tx, {
        companyId,
        invoiceId: inv.id,
        paymentId: p.id,
        amountMinor: appliedMinor,
        createdByUserId: userId,
      });

      // 7) order number (for receipt print)
      let orderNumber: string | null = null;
      const orderId = (inv as any).order_id ?? null;
      if (orderId) {
        const [ord] = await tx
          .select({ orderNumber: orders.orderNumber })
          .from(orders)
          .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
          .execute();
        orderNumber = ord?.orderNumber ?? null;
      }

      // 8) create receipt (idempotent)
      const receipt = await this.createReceiptForPaymentTx(tx, {
        companyId,
        paymentId: p.id,

        invoiceId: inv.id,
        orderId: orderId,

        invoiceNumber: (inv as any).number ?? null,
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
}
