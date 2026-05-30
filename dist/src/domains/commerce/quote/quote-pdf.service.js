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
exports.QuotePdfService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const playwright_chromium_1 = require("playwright-chromium");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const renderOfferLetter_1 = require("../../../common/utils/renderOfferLetter");
const audit_service_1 = require("../../audit/audit.service");
let QuotePdfService = class QuotePdfService {
    constructor(db, awsService, auditService) {
        this.db = db;
        this.awsService = awsService;
        this.auditService = auditService;
        this.DEFAULT_LOGO_URL = 'https://your-public-cdn.com/assets/invoice-default-logo.png';
    }
    async generateAndUploadPdf(params) {
        const { companyId, generatedBy, quoteId, storeId } = params;
        const [quote] = await this.db
            .select()
            .from(schema_1.quoteRequests)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quoteRequests.id, quoteId), (0, drizzle_orm_1.eq)(schema_1.quoteRequests.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.quoteRequests.deletedAt)))
            .execute();
        if (!quote)
            throw new common_1.BadRequestException('Quote not found');
        const items = await this.db
            .select()
            .from(schema_1.quoteRequestItems)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.quoteRequestItems.quoteRequestId, quoteId), (0, drizzle_orm_1.isNull)(schema_1.quoteRequestItems.deletedAt)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.quoteRequestItems.position))
            .execute();
        const resolvedStoreId = storeId ?? quote.storeId ?? null;
        const branding = await this.getBranding(companyId, resolvedStoreId);
        const normalizedBranding = this.normalizeBranding(branding);
        const currency = 'NGN';
        const fmt = (minor) => new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
        }).format((minor ?? 0) / 100);
        const lineItems = items.map((it) => ({
            description: it.nameSnapshot ?? 'Item',
            quantity: Number(it.quantity ?? 1),
            unitPrice: fmt(it.unitPriceMinor),
            lineTotal: fmt(it.unitPriceMinor * Number(it.quantity ?? 1)),
        }));
        const data = {
            quote: {
                number: quote.quoteNumber ?? quoteId.slice(0, 8),
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
        const html = (0, renderOfferLetter_1.wrapInHtml)(this.renderQuoteTemplate(data));
        const pdfBuffer = await this.htmlToPdf(html);
        const safeQuoteNo = data.quote.number.replace(/[^\w-]+/g, '-');
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
    renderQuoteTemplate(data) {
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
            .map((l) => `
    <tr style="border-bottom:1px solid #f5f5f5;">
      <td style="padding:12px 16px; color:#333;">${l.description}</td>
      <td style="padding:12px 16px; text-align:right; color:#555;">${l.quantity}</td>
      <td style="padding:12px 16px; text-align:right; color:#555;">${l.unitPrice}</td>
      <td style="padding:12px 16px; text-align:right; font-weight:600; color:#222;">${l.lineTotal}</td>
    </tr>`)
            .join('')}
  </tbody>
</table>

${data.note
            ? `<div style="margin-bottom:32px; padding:16px; background:#f9f9f9; border-radius:6px;">
        <div style="font-size:10px; text-transform:uppercase; color:#999; letter-spacing:0.5px; margin-bottom:8px;">Note</div>
        <div style="color:#555; line-height:1.6;">${data.note}</div>
       </div>`
            : ''}

${data.branding.footerNote
            ? `<hr style="border:none; border-top:1px solid #eee; margin-top:32px; margin-bottom:16px;" />
       <div style="font-size:10px; color:#999; line-height:1.6;">${data.branding.footerNote}</div>`
            : ''}

</div>
  `.trim();
    }
    async getBranding(companyId, storeId) {
        if (!storeId) {
            const [b] = await this.db
                .select()
                .from(schema_1.invoiceBranding)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.isNull)(schema_1.invoiceBranding.storeId)))
                .execute();
            return b ?? null;
        }
        const rows = await this.db
            .select()
            .from(schema_1.invoiceBranding)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.companyId, companyId), (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.invoiceBranding.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.invoiceBranding.storeId))))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.invoiceBranding.storeId))
            .execute();
        return rows[0] ?? null;
    }
    normalizeBranding(branding) {
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
    async htmlToPdf(html) {
        const browser = await playwright_chromium_1.chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
            const imgs = Array.from(document.images);
            await Promise.all(imgs.map((img) => img.complete
                ? Promise.resolve(true)
                : new Promise((res) => {
                    img.addEventListener('load', () => res(true));
                    img.addEventListener('error', () => res(true));
                })));
        });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '14mm', bottom: '20mm', left: '12mm', right: '12mm' },
            printBackground: true,
        });
        await browser.close();
        return pdfBuffer;
    }
};
exports.QuotePdfService = QuotePdfService;
exports.QuotePdfService = QuotePdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        audit_service_1.AuditService])
], QuotePdfService);
//# sourceMappingURL=quote-pdf.service.js.map