import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { and, eq, desc, asc, isNull, or } from 'drizzle-orm';
import { chromium } from 'playwright-chromium';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import {
  invoiceDocuments,
  invoiceBranding,
  invoiceLines,
  invoices,
  invoiceTemplates,
} from 'src/infrastructure/drizzle/schema';
import { extractHandlebarsVariables } from 'src/common/utils/extractHandlebarsVariables';
import { hasPath } from 'src/common/utils/hasPath';
import {
  renderOfferLetter,
  wrapInHtml,
} from 'src/common/utils/renderOfferLetter';
import { AuditService } from 'src/domains/audit/audit.service';

function remapEachLineVars(template: string, vars: string[]) {
  const inLinesLoop = template.includes('#each lines');
  if (!inLinesLoop) return vars;

  const lineFields = new Set([
    'description',
    'quantity',
    'unitPrice',
    'lineTotal',
  ]);
  return vars.map((v) => (lineFields.has(v) ? `lines.0.${v}` : v));
}

function normalizeRequiredVars(vars: string[]) {
  const allowedRoots = new Set([
    'invoice',
    'supplier',
    'customer',
    'branding',
    'lines',
    'totals',
  ]);
  const ignore = new Set([
    'this',
    'else',
    'if',
    'each',
    '@index',
    '@first',
    '@last',
    '@key',
    'length',
  ]);

  return vars
    .map((v) => v.trim())
    .filter((v) => v.length > 0 && !ignore.has(v))
    .filter((v) => v.includes('.') || allowedRoots.has(v));
}

@Injectable()
export class InvoicePdfService {
  /**
   * ✅ Default logo for preview when branding not set yet.
   * Put your real CDN/public asset here.
   */
  private readonly DEFAULT_LOGO_URL =
    'https://your-public-cdn.com/assets/invoice-default-logo.png';

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly awsService: AwsService,
    private readonly auditService: AuditService,
  ) {}

  // -----------------------------
  // Public: PREVIEW (HTML + PDF)
  // -----------------------------

  async generatePreviewHtml(
    companyId: string,
    opts?: { templateId?: string; storeId?: string | null },
  ) {
    const branding = await this.getBranding(companyId, opts?.storeId ?? null);
    const template = await this.resolveTemplate(
      opts?.templateId,
      branding?.templateId,
    );

    const data = this.getSampleInvoiceViewModel(
      this.normalizeBrandingForRender(branding),
    );

    this.assertTemplateVariables(template.content, data);

    const rawHtml = renderOfferLetter(template.content, data);
    const html = wrapInHtml(rawHtml, template.css ?? undefined);

    return {
      html,
      template: {
        id: template.id,
        key: template.key,
        version: template.version,
        name: template.name,
      },
      usingDefaultTemplate: !opts?.templateId && !branding?.templateId,
    };
  }

  /**
   * ✅ NEW: returns a URL from S3 instead of streaming Buffer.
   * Frontend can open/download without needing Axios headers.
   */
  async generatePreviewPdf(
    companyId: string,
    opts?: { templateId?: string; storeId?: string | null },
  ) {
    const storeId = opts?.storeId ?? null;

    const branding = await this.getBranding(companyId, storeId);
    const template = await this.resolveTemplate(
      opts?.templateId,
      branding?.templateId,
    );

    const data = this.getSampleInvoiceViewModel(
      this.normalizeBrandingForRender(branding),
    );
    this.assertTemplateVariables(template.content, data);

    const rawHtml = renderOfferLetter(template.content, data);
    const html = wrapInHtml(rawHtml, template.css ?? undefined);

    const pdfBuffer = await this.htmlToPdf(html, template.meta);

    // ✅ deterministic key (no multiple preview files)
    const storeScope = storeId ? `store-${storeId}` : 'company-default';
    const key = `company-${companyId}/invoice-previews/${storeScope}/template-${template.id}.pdf`;

    const uploaded = await this.awsService.uploadPublicPdf({
      key,
      pdfBuffer,
    });

    return {
      pdfUrl: uploaded.url,
      storageKey: uploaded.key,
      template: {
        id: template.id,
        key: template.key,
        version: template.version,
        name: template.name,
      },
      storeId,
    };
  }

  // -----------------------------
  // Public: REAL INVOICE PDF
  // -----------------------------

  async generateAndUploadPdf(params: {
    companyId: string;
    generatedBy: string;
    invoiceId: string;
    templateId?: string;
    storeId?: string | null;
  }) {
    const { companyId, generatedBy, invoiceId, templateId, storeId } = params;

    const branding = await this.getBranding(companyId, storeId ?? null);
    const template = await this.resolveTemplate(
      templateId,
      branding?.templateId,
    );

    const data = await this.buildInvoiceViewModel(
      companyId,
      invoiceId,
      this.normalizeBrandingForRender(branding),
    );

    // Move "Shipping" lines to the end (case-insensitive)
    const lines = (data as any)?.invoice?.lines ?? (data as any)?.lines;
    if (Array.isArray(lines)) {
      lines.sort((a: any, b: any) => {
        const aIsShip = String(a?.name ?? a?.description ?? '')
          .toLowerCase()
          .includes('shipping');
        const bIsShip = String(b?.name ?? b?.description ?? '')
          .toLowerCase()
          .includes('shipping');

        if (aIsShip === bIsShip) return 0;
        return aIsShip ? 1 : -1; // shipping last
      });
    }

    this.assertTemplateVariables(template.content, data);

    const rawHtml = renderOfferLetter(template.content, data);
    const html = wrapInHtml(rawHtml, template.css ?? undefined);
    const pdfBuffer = await this.htmlToPdf(html, template.meta);

    // ✅ deterministic per-invoice key OR keep timestamp if you want history in S3
    // Your request says: avoid multiple files for same company + store.
    // For real invoices, I strongly recommend keeping invoiceId in key (unique per invoice).
    const safeInvoiceNo =
      (data as any)?.invoice?.number?.toString().replace(/[^\w-]+/g, '-') ??
      'invoice';

    const key = `company-${companyId}/invoices/${invoiceId}/invoice__${safeInvoiceNo}.pdf`;

    const uploaded = await this.awsService.uploadPublicPdf({
      key,
      pdfBuffer,
    });

    // Persist generation history + supersede previous
    const [previous] = await this.db
      .select()
      .from(invoiceDocuments)
      .where(
        and(
          eq(invoiceDocuments.companyId, companyId),
          eq(invoiceDocuments.invoiceId, invoiceId),
        ),
      )
      .orderBy(desc(invoiceDocuments.createdAt))
      .limit(1)
      .execute();

    const [created] = await this.db
      .insert(invoiceDocuments)
      .values({
        companyId,
        invoiceId,
        templateId: template.id,
        kind: 'pdf',
        storageKey: key,
        fileName: `invoice__${safeInvoiceNo}.pdf`,
        fileUrl: uploaded.url,
        status: 'generated',
        meta: {
          engineVersion: 'playwright-chromium',
          generatedAt: new Date().toISOString(),
        },
      })
      .returning({ id: invoiceDocuments.id })
      .execute();

    if (previous?.id) {
      await this.db
        .update(invoiceDocuments)
        .set({ status: 'superseded', supersededById: created.id })
        .where(eq(invoiceDocuments.id, previous.id))
        .execute();
    }

    await this.auditService.logAction({
      action: 'generate',
      entity: 'generated_invoice',
      entityId: created.id,
      userId: generatedBy,
      details: 'Generated invoice PDF',
      changes: {
        companyId,
        invoiceId,
        templateId: template.id,
        storageKey: key,
        fileUrl: uploaded.url,
        supersededPreviousId: previous?.id ?? null,
      },
    });

    return {
      pdfUrl: uploaded.url,
      fileName: `invoice__${safeInvoiceNo}.pdf`,
      generatedInvoiceId: created.id,
    };
  }

  // -----------------------------
  // Internal: branding/template resolution
  // -----------------------------

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

  private async resolveTemplate(
    explicitTemplateId?: string,
    brandingTemplateId?: string | null,
  ) {
    const chosenId = explicitTemplateId ?? brandingTemplateId ?? null;

    if (chosenId) {
      const [t] = await this.db
        .select()
        .from(invoiceTemplates)
        .where(
          and(
            eq(invoiceTemplates.id, chosenId),
            eq(invoiceTemplates.isActive, true),
          ),
        )
        .execute();

      if (!t) throw new BadRequestException('Template not found');
      return t;
    }

    const [def] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(
        and(
          eq(invoiceTemplates.isActive, true),
          eq((invoiceTemplates as any).isDefault, true),
        ),
      )
      .limit(1)
      .execute();
    if (def) return def;

    const [fallback] = await this.db
      .select()
      .from(invoiceTemplates)
      .where(eq(invoiceTemplates.isActive, true))
      .orderBy(asc(invoiceTemplates.createdAt))
      .limit(1)
      .execute();

    if (!fallback)
      throw new BadRequestException('No invoice templates available');
    return fallback;
  }

  private assertTemplateVariables(templateContent: string, data: any) {
    let required = extractHandlebarsVariables(templateContent);
    required = remapEachLineVars(templateContent, required);
    required = normalizeRequiredVars(required);

    const missing = required.filter((path) => !hasPath(data, path));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing template variables: ${missing.join(', ')}`,
      );
    }
  }

  /**
   * ✅ Ensure logoUrl + bankDetails are never null at render time.
   * This prevents missing vars and ensures PDF preview has a logo.
   */
  private normalizeBrandingForRender(branding: any) {
    const safeBankDetails = {
      bankName: '',
      accountName: '',
      accountNumber: '',
      ...(branding?.bankDetails ?? {}),
    };

    const logoUrl =
      branding?.logoUrl && branding.logoUrl.trim().length > 0
        ? branding.logoUrl
        : this.DEFAULT_LOGO_URL;

    return {
      ...branding,
      logoUrl,
      bankDetails: safeBankDetails,
    };
  }

  // -----------------------------
  // Internal: ViewModels
  // -----------------------------

  private async buildInvoiceViewModel(
    companyId: string,
    invoiceId: string,
    branding: any,
  ) {
    const [inv] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.companyId, companyId)))
      .execute();

    if (!inv) throw new BadRequestException('Invoice not found');

    const lines = await this.db
      .select()
      .from(invoiceLines)
      .where(
        and(
          eq(invoiceLines.invoiceId, invoiceId),
          eq(invoiceLines.companyId, companyId),
        ),
      )
      .execute();

    const currency = inv.currency ?? 'NGN';
    const fmt = (minor: number) => this.formatMinor(minor ?? 0, currency);

    return {
      invoice: {
        id: inv.id,
        number: inv.number ?? inv.id.slice(0, 8),
        issuedAt: inv.issuedAt?.toISOString?.() ?? '',
        dueAt: inv.dueAt?.toISOString?.() ?? '',
        currency,
      },
      supplier: inv.supplierSnapshot ?? {
        name: branding?.supplierName ?? 'Your Company',
        address: branding?.supplierAddress ?? '',
        email: branding?.supplierEmail ?? '',
        phone: branding?.supplierPhone ?? '',
        taxId: branding?.supplierTaxId ?? '',
      },
      customer: inv.customerSnapshot ?? {
        name: 'Customer',
        address: '',
        taxId: '',
      },
      branding: {
        logoUrl: branding?.logoUrl,
        primaryColor: branding?.primaryColor,
        bankDetails: branding?.bankDetails,
        footerNote: branding?.footerNote,
      },
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: fmt(l.unitPriceMinor as any),
        lineTotal: fmt(l.lineTotalMinor as any),
      })),
      totals: {
        subtotal: fmt(inv.subtotalMinor as any),
        tax: fmt(inv.taxMinor as any),
        total: fmt(inv.totalMinor as any),
        paid: fmt(inv.paidMinor as any),
        balance: fmt(inv.balanceMinor as any),
      },
    };
  }

  private getSampleInvoiceViewModel(branding?: any) {
    const currency = 'NGN';
    const fmt = (minor: number) => this.formatMinor(minor, currency);

    return {
      invoice: {
        number: 'INV-0001',
        issuedAt: '2025-01-01',
        dueAt: '2025-01-15',
        currency,
      },
      supplier: {
        name: branding?.supplierName ?? 'Your Company Ltd',
        address: branding?.supplierAddress ?? 'Company Address',
        email: branding?.supplierEmail ?? 'billing@yourco.com',
        phone: branding?.supplierPhone ?? '+234000000000',
        taxId: branding?.supplierTaxId ?? 'TIN/VAT-ID',
      },
      customer: {
        name: 'Sample Customer',
        address: 'Customer Address',
        taxId: '',
      },
      branding: {
        logoUrl: branding?.logoUrl,
        primaryColor: branding?.primaryColor,
        bankDetails: branding?.bankDetails ?? {
          bankName: 'Sample Bank',
          accountName: 'Your Company Ltd',
          accountNumber: '0000000000',
        },
        footerNote: branding?.footerNote ?? 'Thank you for your business.',
      },
      lines: [
        {
          description: 'Product A',
          quantity: 2,
          unitPrice: fmt(500000),
          lineTotal: fmt(1000000),
        },
        {
          description: 'Service B',
          quantity: 1,
          unitPrice: fmt(1500000),
          lineTotal: fmt(1500000),
        },
      ],
      totals: {
        subtotal: fmt(2500000),
        tax: fmt(187500),
        total: fmt(2687500),
        paid: fmt(0),
        balance: fmt(2687500),
      },
    };
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

  /**
   * ✅ Wait for images to load so logos show in PDFs consistently.
   */
  private async htmlToPdf(html: string, meta?: any): Promise<Buffer> {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // networkidle is better for external images/fonts
    await page.setContent(html, { waitUntil: 'networkidle' });

    // wait for images explicitly
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? Promise.resolve(true)
            : new Promise((res) => {
                img.addEventListener('load', () => res(true));
                img.addEventListener('error', () => res(true)); // don't block forever
              }),
        ),
      );
    });

    const format = meta?.page?.format ?? 'A4';
    const margin = meta?.margin ?? {
      top: '10mm',
      bottom: '20mm',
      left: '12mm',
      right: '12mm',
    };

    const pdfBuffer = await page.pdf({
      format,
      margin,
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  }
}
