// src/domains/billing/invoice/invoice-templates/quote-pdf.service.ts
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { and, asc, desc, eq, isNull, or } from 'drizzle-orm';
import { chromium } from 'playwright-chromium';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import {
  invoiceBranding,
  invoiceTemplates,
  quoteRequestItems,
  quoteRequests,
} from 'src/infrastructure/drizzle/schema';
import {
  renderOfferLetter,
  wrapInHtml,
} from 'src/common/utils/renderOfferLetter';
import { AuditService } from 'src/domains/audit/audit.service';

@Injectable()
export class QuotePdfService {
  private readonly DEFAULT_LOGO_URL =
    'https://your-public-cdn.com/assets/invoice-default-logo.png';

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly awsService: AwsService,
    private readonly auditService: AuditService,
  ) {}

  async generateAndUploadPdf(params: {
    companyId: string;
    generatedBy: string;
    quoteId: string;
    storeId?: string | null;
  }) {
    const { companyId, generatedBy, quoteId, storeId } = params;

    const [quote] = await this.db
      .select()
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.id, quoteId),
          eq(quoteRequests.companyId, companyId),
          isNull(quoteRequests.deletedAt),
        ),
      )
      .execute();

    if (!quote) throw new BadRequestException('Quote not found');

    const items = await this.db
      .select()
      .from(quoteRequestItems)
      .where(
        and(
          eq(quoteRequestItems.quoteRequestId, quoteId),
          isNull(quoteRequestItems.deletedAt),
        ),
      )
      .orderBy(asc(quoteRequestItems.position))
      .execute();

    const resolvedStoreId = storeId ?? quote.storeId ?? null;
    const branding = await this.getBranding(companyId, resolvedStoreId);
    const normalizedBranding = this.normalizeBranding(branding);

    const currency = 'NGN';
    const fmt = (minor: number | null) =>
      new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format((minor ?? 0) / 100);

    const lineItems = items.map((it) => ({
      description: it.nameSnapshot ?? 'Item',
      quantity: Number(it.quantity ?? 1),
      unitPrice: fmt(it.unitPriceMinor as any),
      lineTotal: fmt((it.unitPriceMinor as any) * Number(it.quantity ?? 1)),
    }));

    const data = {
      quote: {
        number: (quote as any).quoteNumber ?? quoteId.slice(0, 8),
        createdAt: new Date(quote.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      },
      supplier: {
        name: normalizedBranding.supplierName ?? 'Your Company',
        address: normalizedBranding.supplierAddress ?? '',
        email: normalizedBranding.supplierEmail ?? '',
        phone: normalizedBranding.supplierPhone ?? '',
        taxId: normalizedBranding.supplierTaxId ?? '',
      },
      customer: {
        name: quote.customerName ?? 'Customer',
        email: quote.customerEmail ?? '',
      },
      branding: {
        logoUrl: normalizedBranding.logoUrl,
        primaryColor: normalizedBranding.primaryColor,
        bankDetails: normalizedBranding.bankDetails,
        footerNote: normalizedBranding.footerNote,
      },
      lines: lineItems,
      note: quote.customerNote ?? null,
    };

    const html = wrapInHtml(this.renderQuoteTemplate(data));
    const pdfBuffer = await this.htmlToPdf(html);

    const safeQuoteNo = (data.quote.number as string).replace(/[^\w-]+/g, '-');
    const key = `company-${companyId}/quotes/${quoteId}/quote__${safeQuoteNo}.pdf`;

    const uploaded = await this.awsService.uploadPublicPdf({ key, pdfBuffer });

    await this.auditService.logAction({
      action: 'generate',
      entity: 'quote_pdf',
      entityId: quoteId,
      userId: generatedBy,
      details: 'Generated quote PDF',
      changes: { companyId, quoteId, storageKey: key, fileUrl: uploaded.url },
    });

    return {
      pdfUrl: uploaded.url,
      fileName: `quote__${safeQuoteNo}.pdf`,
    };
  }

  private renderQuoteTemplate(data: any): string {
    return `
<div style="padding: 0 10px; font-size: 13px; color: #222;">

<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px;">
  <div>
    ${data.branding.logoUrl ? `<img src="${data.branding.logoUrl}" style="height:48px; margin-bottom:12px;" />` : ''}
    <div style="font-weight:700; font-size:14px; margin-bottom:4px;">${data.supplier.name}</div>
    <div style="color:#666; line-height:1.6;">${data.supplier.address}</div>
    ${data.supplier.email ? `<div style="color:#666;">${data.supplier.email}</div>` : ''}
    ${data.supplier.phone ? `<div style="color:#666;">${data.supplier.phone}</div>` : ''}
    ${data.supplier.taxId ? `<div style="color:#666; margin-top:4px;">Tax ID: ${data.supplier.taxId}</div>` : ''}
  </div>
  <div style="text-align:right;">
    <div style="font-size:26px; font-weight:700; letter-spacing:2px; color:#111; margin-bottom:12px;">QUOTE</div>
    <div style="margin-bottom:4px;"><strong>#</strong> ${data.quote.number}</div>
    <div style="color:#555;">Date: ${data.quote.createdAt}</div>
  </div>
</div>

<hr style="border:none; border-top:1px solid #eee; margin-bottom:28px;" />

<div style="margin-bottom:32px;">
  <div style="font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; margin-bottom:8px;">Prepared For</div>
  <div style="font-weight:600; font-size:12px; margin-bottom:4px;">${data.customer.name}</div>
  <div style="color:#666;">${data.customer.email}</div>
</div>

<table style="width:100%; border-collapse:collapse; margin-bottom:32px;">
  <thead>
    <tr style="border-bottom:2px solid #eee;">
      <th style="text-align:left; padding:10px 16px; font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; font-weight:600;">Description</th>
      <th style="text-align:right; padding:10px 16px; font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; font-weight:600;">Qty</th>
      <th style="text-align:right; padding:10px 16px; font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; font-weight:600;">Unit Price</th>
      <th style="text-align:right; padding:10px 16px; font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; font-weight:600;">Total</th>
    </tr>
  </thead>
  <tbody>
    ${data.lines
      .map(
        (l: any) => `
    <tr style="border-bottom:1px solid #f5f5f5;">
      <td style="padding:12px 16px; color:#333;">${l.description}</td>
      <td style="padding:12px 16px; text-align:right; color:#555;">${l.quantity}</td>
      <td style="padding:12px 16px; text-align:right; color:#555;">${l.unitPrice}</td>
      <td style="padding:12px 16px; text-align:right; font-weight:600; color:#222;">${l.lineTotal}</td>
    </tr>`,
      )
      .join('')}
  </tbody>
</table>

${
  data.note
    ? `<div style="margin-bottom:32px; padding:16px; background:#f9f9f9; border-radius:6px;">
        <div style="font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; margin-bottom:8px;">Note</div>
        <div style="color:#555; line-height:1.6;">${data.note}</div>
       </div>`
    : ''
}

${
  data.branding.footerNote
    ? `<hr style="border:none; border-top:1px solid #eee; margin-top:32px; margin-bottom:16px;" />
       <div style="font-size:10px; color:#999; line-height:1.6;">${data.branding.footerNote}</div>`
    : ''
}

</div>
  `.trim();
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
    return {
      ...branding,
      logoUrl: branding?.logoUrl?.trim()
        ? branding.logoUrl
        : this.DEFAULT_LOGO_URL,
      bankDetails: {
        bankName: '',
        accountName: '',
        accountNumber: '',
        ...(branding?.bankDetails ?? {}),
      },
    };
  }

  private async htmlToPdf(html: string): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });

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
      format: 'A4',
      margin: { top: '14mm', bottom: '20mm', left: '12mm', right: '12mm' },
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  }
}
