import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { payments, invoiceBranding } from 'src/infrastructure/drizzle/schema';

@Injectable()
export class CheckoutPaymentsService {
  constructor(@Inject(DRIZZLE) private readonly db: DbType) {}

  private firstRow<T = any>(res: any): T | null {
    return (res?.rows?.[0] as T) ?? (res?.[0] as T) ?? null;
  }

  /**
   * Storefront: Initialize bank transfer for an ONLINE order created from checkout.
   * Creates ONE pending payment row (idempotent).
   */
  async initBankTransferForCheckout(
    companyId: string,
    storeId: string,
    dto: { checkoutId: string; customerEmail?: string; customerPhone?: string },
  ) {
    return this.db.transaction(async (tx) => {
      // 1) Find order created from checkout
      const ordRes = await tx.execute(
        sql`
          SELECT * FROM orders
          WHERE company_id = ${companyId}
            AND store_id = ${storeId}
            AND checkout_id = ${dto.checkoutId}
          LIMIT 1
          FOR UPDATE
        ` as any,
      );

      const ord = this.firstRow<any>(ordRes);
      if (!ord) throw new NotFoundException('Order not found for checkout');

      if (ord.status !== 'pending_payment') {
        // If already paid/fulfilled/etc, don't create bank-transfer payment
        throw new BadRequestException(
          `Order is not pending payment (status: ${ord.status})`,
        );
      }

      // 2) Find invoice for order (your complete() creates draft invoice)
      const invRes = await tx.execute(
        sql`
          SELECT * FROM invoices
          WHERE company_id = ${companyId}
            AND order_id = ${ord.id}
          ORDER BY created_at DESC
          LIMIT 1
          FOR UPDATE
        ` as any,
      );
      const inv = this.firstRow<any>(invRes);
      if (!inv) {
        throw new BadRequestException('Invoice not found for order');
      }

      // 3) Compute outstanding amount (use invoice balance if available, else total)
      const balanceMinor = Number(inv.balance_minor ?? inv.balanceMinor ?? 0);
      const totalMinor = Number(inv.total_minor ?? inv.totalMinor ?? 0);
      const paidMinor = Number(inv.paid_minor ?? inv.paidMinor ?? 0);

      // If invoice is draft in your schema, balance might still be 0 until issued/recalc.
      // Fallback to total - paid
      const outstandingMinor =
        balanceMinor > 0 ? balanceMinor : Math.max(totalMinor - paidMinor, 0);

      if (outstandingMinor <= 0) {
        throw new BadRequestException('Invoice already fully paid');
      }

      const currency = (inv.currency ?? ord.currency ?? 'NGN').toUpperCase();

      // 4) Idempotency: reuse existing pending bank transfer payment for this order+invoice
      const [existing] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.companyId, companyId),
            eq(payments.storeId, storeId),
            eq(payments.orderId, ord.id),
            eq(payments.invoiceId, inv.id),
            eq(payments.method, 'bank_transfer' as any),
            eq(payments.status, 'pending' as any),
          ),
        )
        .limit(1)
        .execute();

      let payment = existing ?? null;

      if (!payment) {
        const [created] = await tx
          .insert(payments)
          .values({
            companyId,
            storeId,
            orderId: ord.id,
            invoiceId: inv.id,
            method: 'bank_transfer',
            status: 'pending',
            currency,
            amountMinor: outstandingMinor,
            reference: null, // narration entered later by customer OR added by merchant on confirm
            meta: {
              source: 'storefront',
              checkoutId: dto.checkoutId,
              customerEmail: dto.customerEmail ?? null,
              customerPhone: dto.customerPhone ?? null,
              createdAt: new Date().toISOString(),
            },
            createdAt: new Date(),
          } as any)
          .returning()
          .execute();

        payment = created;
      }

      // 5) Bank details to show customer.
      // Best place (for now): invoiceBranding.bankDetails (company-level or store-level).
      // You already store bankDetails in supplier snapshot on invoice issue,
      // but here invoice might still be draft, so read branding directly.
      //
      // Store-specific wins over global.
      const brandingRows = await tx
        .select()
        .from(invoiceBranding)
        .where(
          and(
            eq(invoiceBranding.companyId, companyId),
            sql`(${invoiceBranding.storeId} IS NULL OR ${invoiceBranding.storeId} = ${storeId})` as any,
          ),
        )
        .orderBy(sql`${invoiceBranding.storeId} DESC NULLS LAST` as any)
        .limit(1)
        .execute();

      const branding = brandingRows?.[0] ?? null;
      const bankDetails = (branding as any)?.bankDetails ?? null;

      if (!bankDetails) {
        // You can choose to allow init without bank details, but storefront UX will be broken.
        throw new BadRequestException(
          'Bank details not configured. Add bank details in invoice branding/settings.',
        );
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
        bankDetails, // show this on checkout payment screen
      };
    });
  }
}
