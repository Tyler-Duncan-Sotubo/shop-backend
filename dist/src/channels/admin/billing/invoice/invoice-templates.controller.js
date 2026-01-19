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
exports.AdminInvoiceTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const update_invoice_branding_dto_1 = require("./dto/invoice-templates-dto/update-invoice-branding.dto");
const update_invoice_logo_dto_1 = require("./dto/invoice-templates-dto/update-invoice-logo.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const invoice_templates_service_1 = require("../../../../domains/billing/invoice/invoice-templates/invoice-templates.service");
const invoice_pdf_service_1 = require("../../../../domains/billing/invoice/invoice-templates/invoice-pdf.service");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let AdminInvoiceTemplatesController = class AdminInvoiceTemplatesController extends base_controller_1.BaseController {
    constructor(invoiceTemplatesService, invoicePdfService) {
        super();
        this.invoiceTemplatesService = invoiceTemplatesService;
        this.invoicePdfService = invoicePdfService;
    }
    async listSystemTemplates() {
        return this.invoiceTemplatesService.listSystemTemplates();
    }
    async getSystemTemplateById(templateId) {
        return this.invoiceTemplatesService.getSystemTemplateById(templateId);
    }
    async seedSystemInvoiceTemplates(user, ip) {
        return this.invoiceTemplatesService.seedSystemInvoiceTemplates(user, ip);
    }
    async getInvoiceBranding(user, storeId) {
        return this.invoiceTemplatesService.getBranding(user.companyId, storeId ?? null);
    }
    async upsertInvoiceBranding(user, dto, ip) {
        return this.invoiceTemplatesService.upsertCompanyBranding(user, dto, ip);
    }
    async previewHtml(user, templateId, storeId) {
        return this.invoiceTemplatesService.previewForCompany(user.companyId, {
            templateId,
            storeId: storeId ?? null,
        });
    }
    async previewPdf(user, storeId, templateId) {
        return this.invoicePdfService.generatePreviewPdf(user.companyId, {
            templateId,
            storeId: storeId,
        });
    }
    async generateForInvoice(user, invoiceId, storeId, templateId) {
        return this.invoicePdfService.generateAndUploadPdf({
            companyId: user.companyId,
            generatedBy: user.id,
            invoiceId,
            templateId,
            storeId: storeId ?? null,
        });
    }
    async uploadInvoiceBrandingLogo(user, dto, ip) {
        return this.invoiceTemplatesService.uploadBrandingLogo(user, dto, ip);
    }
};
exports.AdminInvoiceTemplatesController = AdminInvoiceTemplatesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.read']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "listSystemTemplates", null);
__decorate([
    (0, common_1.Get)(':templateId'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.read']),
    __param(0, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "getSystemTemplateById", null);
__decorate([
    (0, common_1.Post)('seed/system'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "seedSystemInvoiceTemplates", null);
__decorate([
    (0, common_1.Get)('branding'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceBranding.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "getInvoiceBranding", null);
__decorate([
    (0, common_1.Post)('branding'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceBranding.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_invoice_branding_dto_1.UpdateInvoiceBrandingDto, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "upsertInvoiceBranding", null);
__decorate([
    (0, common_1.Get)('preview/html'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.preview']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('templateId')),
    __param(2, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "previewHtml", null);
__decorate([
    (0, common_1.Get)('preview/pdf'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.preview']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Query)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "previewPdf", null);
__decorate([
    (0, common_1.Post)(':invoiceId/pdf'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.pdf.generate']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('invoiceId')),
    __param(2, (0, common_1.Query)('storeId')),
    __param(3, (0, common_1.Query)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "generateForInvoice", null);
__decorate([
    (0, common_1.Post)('branding/logo'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceBranding.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_invoice_logo_dto_1.UpdateInvoiceLogoDto, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceTemplatesController.prototype, "uploadInvoiceBrandingLogo", null);
exports.AdminInvoiceTemplatesController = AdminInvoiceTemplatesController = __decorate([
    (0, common_1.Controller)('invoice-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [invoice_templates_service_1.InvoiceTemplatesService,
        invoice_pdf_service_1.InvoicePdfService])
], AdminInvoiceTemplatesController);
//# sourceMappingURL=invoice-templates.controller.js.map