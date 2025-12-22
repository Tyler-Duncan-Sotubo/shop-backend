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
exports.PublicInvoicesService = void 0;
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const invoice_pdf_service_1 = require("../invoice/invoice-templates/invoice-pdf.service");
let PublicInvoicesService = class PublicInvoicesService {
    constructor(db, invoicePdfService) {
        this.db = db;
        this.invoicePdfService = invoicePdfService;
    }
    newToken() {
        return (0, crypto_1.randomBytes)(24).toString('hex');
    }
    async ensureLink(params) {
        const { companyId, invoiceId, createdBy, expiresAt } = params;
        const [inv] = await this.db
            .select({ id: schema_1.invoices.id })
            .from(schema_1.invoices)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoices.id, invoiceId), (0, drizzle_orm_1.eq)(schema_1.invoices.companyId, companyId)))
            .limit(1)
            .execute();
        if (!inv)
            throw new common_1.NotFoundException('Invoice not found');
        const [existing] = await this.db
            .select()
            .from(schema_1.invoicePublicLinks)
            .where((0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.invoiceId, invoiceId))
            .limit(1)
            .execute();
        if (existing)
            return existing;
        const token = this.newToken();
        const [created] = await this.db
            .insert(schema_1.invoicePublicLinks)
            .values({
            companyId,
            invoiceId,
            token,
            enabled: true,
            expiresAt: expiresAt ?? null,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
            .returning()
            .execute();
        return created;
    }
    async revokeLink(companyId, invoiceId) {
        const [row] = await this.db
            .update(schema_1.invoicePublicLinks)
            .set({ enabled: false, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.invoiceId, invoiceId)))
            .returning()
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Public link not found');
        return row;
    }
    async rotateLink(params) {
        const { companyId, invoiceId } = params;
        const token = this.newToken();
        const [row] = await this.db
            .update(schema_1.invoicePublicLinks)
            .set({ token, enabled: true, updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.invoiceId, invoiceId)))
            .returning()
            .execute();
        if (!row)
            throw new common_1.NotFoundException('Public link not found');
        return row;
    }
    assertLinkActive(link) {
        if (!link?.enabled)
            throw new common_1.NotFoundException('Invoice link not found');
        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            throw new common_1.GoneException('Invoice link expired');
        }
    }
    async getPublicInvoiceByToken(token) {
        const [link] = await this.db
            .select()
            .from(schema_1.invoicePublicLinks)
            .where((0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.token, token))
            .limit(1)
            .execute();
        if (!link)
            throw new common_1.NotFoundException('Invoice link not found');
        this.assertLinkActive(link);
        await this.db
            .update(schema_1.invoicePublicLinks)
            .set({
            viewCount: (link.viewCount ?? 0) + 1,
            lastViewedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.id, link.id))
            .execute();
        const branding = await this.invoicePdfService.getBranding(link.companyId, null);
        const data = await this.invoicePdfService.buildInvoiceViewModel(link.companyId, link.invoiceId, this.invoicePdfService.normalizeBrandingForRender(branding));
        return { link, data };
    }
    async getPublicPdfUrlByToken(token) {
        const [link] = await this.db
            .select()
            .from(schema_1.invoicePublicLinks)
            .where((0, drizzle_orm_1.eq)(schema_1.invoicePublicLinks.token, token))
            .limit(1)
            .execute();
        if (!link)
            throw new common_1.NotFoundException('Invoice link not found');
        this.assertLinkActive(link);
        const rows = await this.db
            .select()
            .from(schema_1.invoiceDocuments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.companyId, link.companyId), (0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.invoiceId, link.invoiceId), (0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.kind, 'pdf'), (0, drizzle_orm_1.eq)(schema_1.invoiceDocuments.status, 'generated')))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.invoiceDocuments.createdAt))
            .limit(1)
            .execute();
        const doc = rows[0];
        if (!doc?.fileUrl)
            throw new common_1.NotFoundException('PDF not generated yet');
        return { pdfUrl: doc.fileUrl, fileName: doc.fileName };
    }
};
exports.PublicInvoicesService = PublicInvoicesService;
exports.PublicInvoicesService = PublicInvoicesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_2.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, invoice_pdf_service_1.InvoicePdfService])
], PublicInvoicesService);
//# sourceMappingURL=public-invoices.service.js.map