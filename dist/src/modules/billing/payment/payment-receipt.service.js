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
exports.PaymentReceiptService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const playwright_chromium_1 = require("playwright-chromium");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const aws_service_1 = require("../../../common/aws/aws.service");
const schema_1 = require("../../../drizzle/schema");
const renderOfferLetter_1 = require("../../../common/utils/renderOfferLetter");
const payment_receipt_template_1 = require("./payment-receipt.template");
let PaymentReceiptService = class PaymentReceiptService {
    constructor(db, aws) {
        this.db = db;
        this.aws = aws;
        this.DEFAULT_LOGO_URL = 'https://your-public-cdn.com/assets/invoice-default-logo.png';
    }
    methodLabel(method) {
        const map = {
            bank_transfer: 'Bank Transfer',
            cash: 'Cash',
            card_manual: 'Card',
            other: 'Other',
            gateway: 'Gateway',
        };
        return map[method] ?? method;
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
        const logoUrl = branding?.logoUrl && branding.logoUrl.trim().length > 0
            ? branding.logoUrl
            : this.DEFAULT_LOGO_URL;
        return {
            ...branding,
            logoUrl,
        };
    }
    async getReceiptViewModel(companyId, paymentId) {
        console.log('Generating receipt view model for payment:', paymentId);
        const [r] = await this.db
            .select()
            .from(schema_1.paymentReceipts)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentReceipts.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.paymentReceipts.paymentId, paymentId)))
            .execute();
        if (!r)
            throw new common_1.NotFoundException('Receipt not found for payment');
        const [p] = await this.db
            .select()
            .from(schema_1.payments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payments.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.payments.id, paymentId)))
            .execute();
        if (!p)
            throw new common_1.NotFoundException('Payment not found');
        let inv = null;
        if (r.invoiceId) {
            const [row] = await this.db
                .select({
                number: schema_1.invoices.number,
                balanceMinor: schema_1.invoices.balanceMinor,
                currency: schema_1.invoices.currency,
                storeId: schema_1.invoices.storeId,
            })
                .from(schema_1.invoices)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoices.id, r.invoiceId)))
                .execute();
            inv = row ?? null;
        }
        let ord = null;
        if (r.orderId) {
            const [row] = await this.db
                .select({ orderNumber: schema_1.orders.orderNumber })
                .from(schema_1.orders)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.orders.id, r.orderId)))
                .execute();
            ord = row ?? null;
        }
        const [co] = await this.db
            .select({ id: schema_1.companies.id })
            .from(schema_1.companies)
            .where((0, drizzle_orm_1.eq)(schema_1.companies.id, companyId))
            .execute();
        if (!co)
            throw new common_1.BadRequestException('Company not found');
        const storeId = inv?.storeId ?? null;
        const branding = this.normalizeBranding(await this.getBranding(companyId, storeId));
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
    async generateReceiptPdfUrl(companyId, paymentId) {
        const data = await this.getReceiptViewModel(companyId, paymentId);
        const template = (0, payment_receipt_template_1.paymentReceiptThermalTemplate)();
        const css = (0, payment_receipt_template_1.paymentReceiptThermalCss)();
        const rawHtml = (0, renderOfferLetter_1.renderOfferLetter)(template, data);
        const html = (0, renderOfferLetter_1.wrapInHtml)(rawHtml, css);
        const pdfBuffer = await this.htmlToPdf(html);
        const key = `company-${companyId}/receipts/payments/${paymentId}/receipt.pdf`;
        const uploaded = await this.aws.uploadPublicPdf({ key, pdfBuffer });
        return { pdfUrl: uploaded.url, storageKey: uploaded.key };
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
            printBackground: true,
        });
        await browser.close();
        return pdfBuffer;
    }
};
exports.PaymentReceiptService = PaymentReceiptService;
exports.PaymentReceiptService = PaymentReceiptService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService])
], PaymentReceiptService);
//# sourceMappingURL=payment-receipt.service.js.map