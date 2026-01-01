import {
  Injectable,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, or, desc } from 'drizzle-orm';
import { chromium } from 'playwright-chromium';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import { AwsService } from 'src/common/aws/aws.service';
import {
  paymentReceipts,
  payments,
  invoices,
  orders,
  invoiceBranding,
  companies,
} from 'src/drizzle/schema';
import {
  wrapInHtml,
  renderOfferLetter,
} from 'src/common/utils/renderOfferLetter';
import {
  paymentReceiptThermalCss,
  paymentReceiptThermalTemplate,
} from './payment-receipt.template';

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
    // same logic as InvoicePdfService
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

    return {
      ...branding,
      logoUrl,
    };
  }

  async getReceiptViewModel(companyId: string, paymentId: string) {
    console.log('Generating receipt view model for payment:', paymentId);
    // receipt row (must exist)
    const [r] = await this.db
      .select()
      .from(paymentReceipts)
      .where(
        and(
          eq(paymentReceipts.companyId, companyId),
          eq(paymentReceipts.paymentId, paymentId),
        ),
      )
      .execute();

    if (!r) throw new NotFoundException('Receipt not found for payment');

    // payment row
    const [p] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.companyId, companyId), eq(payments.id, paymentId)))
      .execute();
    if (!p) throw new NotFoundException('Payment not found');

    // invoice balance remaining (optional)
    let inv: any | null = null;
    if (r.invoiceId) {
      const [row] = await this.db
        .select({
          number: invoices.number,
          balanceMinor: invoices.balanceMinor,
          currency: invoices.currency,
          storeId: invoices.storeId,
        })
        .from(invoices)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.id, r.invoiceId)),
        )
        .execute();
      inv = row ?? null;
    }

    // orderNumber fallback if receipt didn’t store it (but it should)
    let ord: any | null = null;
    if (r.orderId) {
      const [row] = await this.db
        .select({ orderNumber: orders.orderNumber })
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, r.orderId)))
        .execute();
      ord = row ?? null;
    }

    // company/store header (minimal)
    const [co] = await this.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .execute();

    if (!co) throw new BadRequestException('Company not found');

    const storeId = (inv as any)?.storeId ?? null;
    const branding = this.normalizeBranding(
      await this.getBranding(companyId, storeId),
    );

    const currency = p.currency ?? inv?.currency ?? r.currency ?? 'NGN';

    const issuedAt = (r.issuedAt ?? r.createdAt ?? new Date()).toISOString();

    return {
      receipt: {
        receiptNumber: r.receiptNumber,
        issuedAt,
        orderNumber: r.orderNumber ?? ord?.orderNumber ?? null,
        invoiceNumber: r.invoiceNumber ?? inv?.number ?? null,
      },
      payment: {
        amount: this.formatMinor(Number(p.amountMinor ?? 0), currency),
        amountMinor: Number(p.amountMinor ?? 0),
        currency,
        method: p.method,
        methodLabel: this.methodLabel(String(p.method)),
        reference: p.reference ?? null,
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

    const pdfBuffer = await page.pdf({
      // Template already sets @page 80mm auto
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  }
}
