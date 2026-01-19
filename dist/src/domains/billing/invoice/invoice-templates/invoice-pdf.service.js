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
exports.InvoicePdfService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const playwright_chromium_1 = require("playwright-chromium");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const aws_service_1 = require("../../../../infrastructure/aws/aws.service");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const extractHandlebarsVariables_1 = require("../../../../common/utils/extractHandlebarsVariables");
const hasPath_1 = require("../../../../common/utils/hasPath");
const renderOfferLetter_1 = require("../../../../common/utils/renderOfferLetter");
const audit_service_1 = require("../../../audit/audit.service");
function remapEachLineVars(template, vars) {
    const inLinesLoop = template.includes('#each lines');
    if (!inLinesLoop)
        return vars;
    const lineFields = new Set([
        'description',
        'quantity',
        'unitPrice',
        'lineTotal',
    ]);
    return vars.map((v) => (lineFields.has(v) ? `lines.0.${v}` : v));
}
function normalizeRequiredVars(vars) {
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
let InvoicePdfService = class InvoicePdfService {
    constructor(db, awsService, auditService) {
        this.db = db;
        this.awsService = awsService;
        this.auditService = auditService;
        this.DEFAULT_LOGO_URL = 'https://your-public-cdn.com/assets/invoice-default-logo.png';
    }
    async generatePreviewHtml(companyId, opts) {
        const branding = await this.getBranding(companyId, opts?.storeId ?? null);
        const template = await this.resolveTemplate(opts?.templateId, branding?.templateId);
        const data = this.getSampleInvoiceViewModel(this.normalizeBrandingForRender(branding));
        this.assertTemplateVariables(template.content, data);
        const rawHtml = (0, renderOfferLetter_1.renderOfferLetter)(template.content, data);
        const html = (0, renderOfferLetter_1.wrapInHtml)(rawHtml, template.css ?? undefined);
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
    async generatePreviewPdf(companyId, opts) {
        const storeId = opts?.storeId ?? null;
        const branding = await this.getBranding(companyId, storeId);
        const template = await this.resolveTemplate(opts?.templateId, branding?.templateId);
        const data = this.getSampleInvoiceViewModel(this.normalizeBrandingForRender(branding));
        this.assertTemplateVariables(template.content, data);
        const rawHtml = (0, renderOfferLetter_1.renderOfferLetter)(template.content, data);
        const html = (0, renderOfferLetter_1.wrapInHtml)(rawHtml, template.css ?? undefined);
        const pdfBuffer = await this.htmlToPdf(html, template.meta);
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
    async generateAndUploadPdf(params) {
        const { companyId, generatedBy, invoiceId, templateId, storeId } = params;
        const branding = await this.getBranding(companyId, storeId ?? null);
        const template = await this.resolveTemplate(templateId, branding?.templateId);
        const data = await this.buildInvoiceViewModel(companyId, invoiceId, this.normalizeBrandingForRender(branding));
        const lines = data?.invoice?.lines ?? data?.lines;
        if (Array.isArray(lines)) {
            lines.sort((a, b) => {
                const aIsShip = String(a?.name ?? a?.description ?? '')
                    .toLowerCase()
                    .includes('shipping');
                const bIsShip = String(b?.name ?? b?.description ?? '')
                    .toLowerCase()
                    .includes('shipping');
                if (aIsShip === bIsShip)
                    return 0;
                return aIsShip ? 1 : -1;
            });
        }
        this.assertTemplateVariables(template.content, data);
        const rawHtml = (0, renderOfferLetter_1.renderOfferLetter)(template.content, data);
        const html = (0, renderOfferLetter_1.wrapInHtml)(rawHtml, template.css ?? undefined);
        const pdfBuffer = await this.htmlToPdf(html, template.meta);
        const safeInvoiceNo = data?.invoice?.number?.toString().replace(/[^\w-]+/g, '-') ??
            'invoice';
        const key = `company-${companyId}/invoices/${invoiceId}/invoice__${safeInvoiceNo}.pdf`;
        const uploaded = await this.awsService.uploadPublicPdf({
            key,
            pdfBuffer,
        });
        const [previous] = await this.db
            .select()
            .from(schema_1.invoiceDocuments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.invoiceId, invoiceId)))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.invoiceDocuments.createdAt))
            .limit(1)
            .execute();
        const [created] = await this.db
            .insert(schema_1.invoiceDocuments)
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
            .returning({ id: schema_1.invoiceDocuments.id })
            .execute();
        if (previous?.id) {
            await this.db
                .update(schema_1.invoiceDocuments)
                .set({ status: 'superseded', supersededById: created.id })
                .where((0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.id, previous.id))
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
    async resolveTemplate(explicitTemplateId, brandingTemplateId) {
        const chosenId = explicitTemplateId ?? brandingTemplateId ?? null;
        if (chosenId) {
            const [t] = await this.db
                .select()
                .from(schema_1.invoiceTemplates)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.id, chosenId), (0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true)))
                .execute();
            if (!t)
                throw new common_1.BadRequestException('Template not found');
            return t;
        }
        const [def] = await this.db
            .select()
            .from(schema_1.invoiceTemplates)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true), (0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isDefault, true)))
            .limit(1)
            .execute();
        if (def)
            return def;
        const [fallback] = await this.db
            .select()
            .from(schema_1.invoiceTemplates)
            .where((0, drizzle_orm_1.eq)(schema_1.invoiceTemplates.isActive, true))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.invoiceTemplates.createdAt))
            .limit(1)
            .execute();
        if (!fallback)
            throw new common_1.BadRequestException('No invoice templates available');
        return fallback;
    }
    assertTemplateVariables(templateContent, data) {
        let required = (0, extractHandlebarsVariables_1.extractHandlebarsVariables)(templateContent);
        required = remapEachLineVars(templateContent, required);
        required = normalizeRequiredVars(required);
        const missing = required.filter((path) => !(0, hasPath_1.hasPath)(data, path));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Missing template variables: ${missing.join(', ')}`);
        }
    }
    normalizeBrandingForRender(branding) {
        const safeBankDetails = {
            bankName: '',
            accountName: '',
            accountNumber: '',
            ...(branding?.bankDetails ?? {}),
        };
        const logoUrl = branding?.logoUrl && branding.logoUrl.trim().length > 0
            ? branding.logoUrl
            : this.DEFAULT_LOGO_URL;
        return {
            ...branding,
            logoUrl,
            bankDetails: safeBankDetails,
        };
    }
    async buildInvoiceViewModel(companyId, invoiceId, branding) {
        const [inv] = await this.db
            .select()
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId), (0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId)))
            .execute();
        if (!inv)
            throw new common_1.BadRequestException('Invoice not found');
        const lines = await this.db
            .select()
            .from(schema_1.invoiceLines)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceLines.invoiceId, invoiceId), (0, drizzle_orm_1.eq)(schema_1.invoiceLines.companyId, companyId)))
            .execute();
        const currency = inv.currency ?? 'NGN';
        const fmt = (minor) => this.formatMinor(minor ?? 0, currency);
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
                unitPrice: fmt(l.unitPriceMinor),
                lineTotal: fmt(l.lineTotalMinor),
            })),
            totals: {
                subtotal: fmt(inv.subtotalMinor),
                tax: fmt(inv.taxMinor),
                total: fmt(inv.totalMinor),
                paid: fmt(inv.paidMinor),
                balance: fmt(inv.balanceMinor),
            },
        };
    }
    getSampleInvoiceViewModel(branding) {
        const currency = 'NGN';
        const fmt = (minor) => this.formatMinor(minor, currency);
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
    formatMinor(amountMinor, currency) {
        const value = (amountMinor ?? 0) / 100;
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    }
    async htmlToPdf(html, meta) {
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
};
exports.InvoicePdfService = InvoicePdfService;
exports.InvoicePdfService = InvoicePdfService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService,
        audit_service_1.AuditService])
], InvoicePdfService);
//# sourceMappingURL=invoice-pdf.service.js.map