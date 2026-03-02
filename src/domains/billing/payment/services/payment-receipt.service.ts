// src/modules/billing/payments/services/payment-receipt.service.ts
import {
  Injectable,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, or, desc, sql } from 'drizzle-orm';
import { chromium } from 'playwright-chromium';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import {
  paymentReceipts,
  payments,
  invoices,
  orders,
  invoiceBranding,
  companies,
  receiptCounters,
} from 'src/infrastructure/drizzle/schema';
import {
  wrapInHtml,
  renderOfferLetter,
} from 'src/common/utils/renderOfferLetter';
import {
  paymentReceiptThermalCss,
  paymentReceiptThermalTemplate,
} from '../payment-receipt.template';

@Injectable()
export class PaymentReceiptService {
  private readonly DEFAULT_LOGO_URL =
    'https://your-public-cdn.com/assets/invoice-default-logo.png';

  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly aws: AwsService,
  ) {}

  private methodLabel(method: string) {
    const map: Record<string, string> = {
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
      card_manual: 'Card',
      other: 'Other',
      gateway: 'Gateway',
    };
    return map[method] ?? method;
  }

  private formatMinor(amountMinor: number, currency: string) {
    const value = (amountMinor ?? 0) / 100;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  private async getBranding(companyId: string, storeId?: string | null) {
    if (!storeId) {
      const [b] = await this.db
        .select()
        .from(invoiceBranding)
        .where(
          and(
            eq(invoiceBranding.companyId, companyId),
            isNull(invoiceBranding.storeId),
          ),
        )
        .execute();
      return b ?? null;
    }

    const rows = await this.db
      .select()
      .from(invoiceBranding)
      .where(
        and(
          eq(invoiceBranding.companyId, companyId),
          or(
            eq(invoiceBranding.storeId, storeId),
            isNull(invoiceBranding.storeId),
          ),
        ),
      )
      .orderBy(desc(invoiceBranding.storeId))
      .execute();

    return rows[0] ?? null;
  }

  private normalizeBranding(branding: any) {
    const logoUrl =
      branding?.logoUrl && branding.logoUrl.trim().length > 0
        ? branding.logoUrl
        : this.DEFAULT_LOGO_URL;

    return { ...branding, logoUrl };
  }

  /* ------------------------------------------------------------ */
  /* Receipt ensure (idempotent, fixes "Receipt not found")        */
  /* ------------------------------------------------------------ */

  private formatReceiptNumber(seq: number) {
    return `RCT-${String(seq).padStart(6, '0')}`;
  }

  private async nextReceiptSequenceTx(tx: any, companyId: string) {
    const res = await tx.execute(
      sql`SELECT * FROM receipt_counters WHERE company_id = ${companyId} FOR UPDATE`,
    );
    const row = (res as any)?.rows?.[0] ?? null;

    if (!row) {
      await tx.insert(receiptCounters).values({
        companyId,
        nextNumber: 2,
        updatedAt: new Date(),
      } as any);
      return 1;
    }

    const seq = Number(row.next_number ?? 1);

    await tx
      .update(receiptCounters)
      .set({ nextNumber: seq + 1, updatedAt: new Date() } as any)
      .where(eq(receiptCounters.companyId, companyId))
      .execute();

    return seq;
  }

  private async ensureReceiptForPaymentTx(
    tx: any,
    companyId: string,
    paymentId: string,
  ) {
    const [existing] = await tx
      .select()
      .from(paymentReceipts)
      .where(
        and(
          eq(paymentReceipts.companyId, companyId),
          eq(paymentReceipts.paymentId, paymentId),
        ),
      )
      .execute();

    if (existing) return existing;

    const [p] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.companyId, companyId), eq(payments.id, paymentId)))
      .execute();
    if (!p) throw new NotFoundException('Payment not found');

    let inv: any | null = null;
    if ((p as any).invoiceId) {
      const [row] = await tx
        .select({
          id: invoices.id,
          number: invoices.number,
          orderId: invoices.orderId,
          customerSnapshot: invoices.customerSnapshot,
          supplierSnapshot: invoices.supplierSnapshot,
          currency: invoices.currency,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, (p as any).invoiceId),
          ),
        )
        .execute();
      inv = row ?? null;
    }

    const orderId = (p as any).orderId ?? inv?.orderId ?? null;

    let orderNumber: string | null = null;
    if (orderId) {
      const [ord] = await tx
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();
      orderNumber = ord?.orderNumber ?? null;
    }

    const seq = await this.nextReceiptSequenceTx(tx, companyId);
    const receiptNumber = this.formatReceiptNumber(seq);

    const currency =
      (p as any).currency ??
      inv?.currency ??
      (p as any).meta?.currency ??
      'NGN';

    const [created] = await tx
      .insert(paymentReceipts)
      .values({
        companyId,
        paymentId,

        invoiceId: (p as any).invoiceId ?? null,
        orderId,

        invoiceNumber: inv?.number ?? null,
        orderNumber,

        sequenceNumber: seq,
        receiptNumber,

        currency,
        amountMinor: Number((p as any).amountMinor ?? 0),

        method: (p as any).method,
        reference: (p as any).reference ?? null,

        customerSnapshot: inv?.customerSnapshot ?? null,
        storeSnapshot: inv?.supplierSnapshot ?? null,
        meta: (p as any).meta ?? null,

        issuedAt: new Date(),
        createdByUserId: (p as any).createdByUserId ?? null,
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    return created;
  }

  /* ------------------------------------------------------------ */
  /* Public API (names unchanged)                                 */
  /* ------------------------------------------------------------ */

  async getReceiptViewModel(companyId: string, paymentId: string) {
    // ✅ ensure receipt exists (generate-on-click safe)
    const r = await this.db.transaction((tx) =>
      this.ensureReceiptForPaymentTx(tx, companyId, paymentId),
    );

    // payment row
    const [p] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.companyId, companyId), eq(payments.id, paymentId)))
      .execute();
    if (!p) throw new NotFoundException('Payment not found');

    // invoice balance remaining (optional)
    let inv: any | null = null;
    if ((r as any).invoiceId) {
      const [row] = await this.db
        .select({
          number: invoices.number,
          balanceMinor: invoices.balanceMinor,
          currency: invoices.currency,
          storeId: invoices.storeId,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.id, (r as any).invoiceId),
          ),
        )
        .execute();
      inv = row ?? null;
    }

    // orderNumber fallback if receipt didn’t store it
    let ord: any | null = null;
    if ((r as any).orderId) {
      const [row] = await this.db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(
          and(
            eq(orders.companyId, companyId),
            eq(orders.id, (r as any).orderId),
          ),
        )
        .execute();
      ord = row ?? null;
    }

    // company existence check (kept)
    const [co] = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();
    if (!co) throw new BadRequestException('Company not found');

    const storeId = inv?.storeId ?? null;
    const branding = this.normalizeBranding(
      await this.getBranding(companyId, storeId),
    );

    const currency =
      (p as any).currency ?? inv?.currency ?? (r as any).currency ?? 'NGN';

    const issuedAt = (
      (r as any).issuedAt ??
      (r as any).createdAt ??
      new Date()
    ).toISOString();

    return {
      receipt: {
        receiptNumber: (r as any).receiptNumber,
        issuedAt,
        orderNumber: (r as any).orderNumber ?? ord?.orderNumber ?? null,
        invoiceNumber: (r as any).invoiceNumber ?? inv?.number ?? null,
      },
      payment: {
        amount: this.formatMinor(Number((p as any).amountMinor ?? 0), currency),
        amountMinor: Number((p as any).amountMinor ?? 0),
        currency,
        method: (p as any).method,
        methodLabel: this.methodLabel(String((p as any).method)),
        reference: (p as any).reference ?? null,
      },
      invoice: inv
        ? {
            balance: this.formatMinor(Number(inv.balanceMinor ?? 0), currency),
            balanceMinor: Number(inv.balanceMinor ?? 0),
          }
        : null,
      supplier: {
        name: branding?.supplierName ?? 'Your Company',
        address: branding?.supplierAddress ?? '',
        email: branding?.supplierEmail ?? '',
        phone: branding?.supplierPhone ?? '',
      },
      branding: {
        logoUrl: branding?.logoUrl,
        footerNote: branding?.footerNote ?? '',
      },
    };
  }

  async generateReceiptPdfUrl(companyId: string, paymentId: string) {
    const data = await this.getReceiptViewModel(companyId, paymentId);

    const template = paymentReceiptThermalTemplate();
    const css = paymentReceiptThermalCss();

    const rawHtml = renderOfferLetter(template, data);
    const html = wrapInHtml(rawHtml, css);

    const pdfBuffer = await this.htmlToPdf(html);

    const key = `company-${companyId}/receipts/payments/${paymentId}/receipt.pdf`;
    const uploaded = await this.aws.uploadPublicPdf({ key, pdfBuffer });

    return { pdfUrl: uploaded.url, storageKey: uploaded.key };
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    try {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext();
      const page = await context.newPage();

      await page.setContent(html, { waitUntil: 'networkidle' });

      // wait for images (logo) to load
      await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(
          imgs.map((img) =>
            img.complete
              ? Promise.resolve(true)
              : new Promise((res) => {
                  img.addEventListener('load', () => res(true));
                  img.addEventListener('error', () => res(true));
                }),
          ),
        );
      });

      const pdfBuffer = await page.pdf({ printBackground: true });

      await browser.close();
      return pdfBuffer;
    } catch (e: any) {
      throw new BadRequestException(
        'Failed to generate PDF receipt: ' + (e.message ?? String(e)),
      );
    }
  }

  async attachPdfToReceiptByPaymentId(
    companyId: string,
    paymentId: string,
    pdfUrl: string,
    storageKey: string,
  ) {
    await this.db
      .update(paymentReceipts)
      .set({
        pdfUrl,
        pdfStorageKey: storageKey,
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(paymentReceipts.companyId, companyId),
          eq(paymentReceipts.paymentId, paymentId),
        ),
      )
      .execute();

    return { ok: true };
  }
}
