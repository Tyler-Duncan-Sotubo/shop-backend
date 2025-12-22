// src/modules/billing/invoice/services/payments.service.ts
import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import { invoices, payments, paymentAllocations } from 'src/drizzle/schema';
import { InvoiceService } from '../invoice/invoice.service';
import { PaystackSuccessDto } from './dto/paystack-success.dto';
import { ConfirmBankTransferDto } from './dto/confirm-bank-transfer.dto';
import { RecordBankTransferDto } from './dto/record-bank-transfer.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Paystack success: idempotent by (companyId, provider, providerRef).
   * Requires payments schema to have providerRef column (recommended).
   */
  async handlePaystackSuccess(
    dto: PaystackSuccessDto,
    companyId: string,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      // ✅ create invoice draft inside same tx
      const inv = await this.invoiceService.createDraftFromOrder(
        {
          orderId: dto.orderId,
          storeId: dto.storeId ?? null,
          currency: dto.currency,
          type: 'invoice',
        },
        companyId,
        { tx },
      );

      // ✅ issue invoice inside same tx
      const issued = await this.invoiceService.issueInvoice(
        inv.id,
        {
          storeId: inv.storeId ?? null,
        },
        companyId,
        userId,
        { tx },
      );

      // 3) upsert payment (idempotent)
      const [existingPayment] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.companyId, companyId),
            eq(payments.provider, 'paystack'),
            eq((payments as any).providerRef, dto.providerRef),
          ),
        )
        .execute();

      let paymentId = (existingPayment as any)?.id;

      if (!paymentId) {
        const [p] = await tx
          .insert(payments)
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
          } as any)
          .returning({ id: payments.id })
          .execute();
        paymentId = p.id;
      }

      // 4) allocate payment to invoice
      await this.applyPaymentToInvoiceTx(tx, {
        companyId,
        invoiceId: (issued as any).id,
        paymentId,
        amountAppliedMinor: dto.amountMinor,
      });

      // 5) return updated invoice
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

      return { invoice: finalInvoice, paymentId };
    });
  }

  async recordBankTransfer(dto: RecordBankTransferDto, companyId: string) {
    const [inv] = await this.db
      .select()
      .from(invoices)
      .where(
        and(eq(invoices.companyId, companyId), eq(invoices.id, dto.invoiceId)),
      )
      .execute();

    if (!inv) throw new NotFoundException('Invoice not found');
    if ((inv as any).currency !== dto.currency)
      throw new BadRequestException('Currency mismatch');

    const [p] = await this.db
      .insert(payments)
      .values({
        companyId,
        invoiceId: dto.invoiceId,
        method: 'bank_transfer',
        status: 'pending',
        currency: dto.currency,
        amountMinor: Math.trunc(dto.amountMinor),
        reference: dto.narration ?? null, // ✅ schema uses reference
        meta: dto.meta ?? null,
        receivedAt: new Date(),
      } as any)
      .returning({ id: payments.id })
      .execute();

    return { paymentId: p.id };
  }

  async confirmBankTransferAndApply(
    paymentId: string,
    dto: ConfirmBankTransferDto,
    companyId: string,
    userId: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [p] = await tx
        .select()
        .from(payments)
        .where(
          and(eq(payments.companyId, companyId), eq(payments.id, paymentId)),
        )
        .execute();

      if (!p) throw new NotFoundException('Payment not found');

      await tx
        .update(payments)
        .set({ status: 'succeeded', confirmedAt: new Date() } as any)
        .where(eq(payments.id, paymentId))
        .execute();

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

      if (inv.status === 'draft') {
        await this.invoiceService.issueInvoice(
          inv.id,
          {
            storeId: inv.storeId ?? null,
          },
          companyId,
          userId,
          { tx },
        );
      }

      await this.applyPaymentToInvoiceTx(tx, {
        companyId: companyId,
        invoiceId: dto.invoiceId,
        paymentId: paymentId,
        amountAppliedMinor: Number((p as any).amountMinor),
      });

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

      return { invoice: finalInvoice };
    });
  }

  private async applyPaymentToInvoiceTx(
    tx: any,
    dto: {
      companyId: string;
      invoiceId: string;
      paymentId: string;
      amountAppliedMinor: number;
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

    const amount = Math.max(0, Math.trunc(dto.amountAppliedMinor));
    if (amount <= 0)
      throw new BadRequestException('Payment amount must be > 0');

    const remaining = Math.max(totalMinor - alreadyPaid, 0);
    const applied = Math.min(amount, remaining);
    if (applied <= 0) return;

    const [existing] = await tx
      .select()
      .from(paymentAllocations)
      .where(
        and(
          eq(paymentAllocations.paymentId, dto.paymentId),
          eq(paymentAllocations.invoiceId, dto.invoiceId),
        ),
      )
      .execute();

    if (!existing) {
      await tx
        .insert(paymentAllocations)
        .values({
          companyId: dto.companyId,
          invoiceId: dto.invoiceId,
          paymentId: dto.paymentId,
          amountMinor: applied, // ✅ schema column is amountMinor
          status: 'applied',
        })
        .execute();
    }

    const newPaid = alreadyPaid + applied;
    const newBalance = Math.max(totalMinor - newPaid, 0);

    const newStatus =
      newBalance === 0 ? 'paid' : newPaid > 0 ? 'partially_paid' : inv.status;

    await tx
      .update(invoices)
      .set({
        paidMinor: newPaid,
        balanceMinor: newBalance,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, dto.invoiceId))
      .execute();
  }
}
