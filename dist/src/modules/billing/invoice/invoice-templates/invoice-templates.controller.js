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
exports.InvoiceTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../../common/interceptor/base.controller");
const invoice_templates_service_1 = require("./invoice-templates.service");
const update_invoice_branding_dto_1 = require("./dto/update-invoice-branding.dto");
const invoice_pdf_service_1 = require("./invoice-pdf.service");
const update_invoice_logo_dto_1 = require("./dto/update-invoice-logo.dto");
let InvoiceTemplatesController = class InvoiceTemplatesController extends base_controller_1.BaseController {
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
exports.InvoiceTemplatesController = InvoiceTemplatesController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.read']),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "listSystemTemplates", null);
__decorate([
    (0, common_1.Get)(':templateId'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.read']),
    __param(0, (0, common_1.Param)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "getSystemTemplateById", null);
__decorate([
    (0, common_1.Post)('seed/system'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "seedSystemInvoiceTemplates", null);
__decorate([
    (0, common_1.Get)('branding'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceBranding.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "getInvoiceBranding", null);
__decorate([
    (0, common_1.Post)('branding'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceBranding.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_invoice_branding_dto_1.UpdateInvoiceBrandingDto, String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "upsertInvoiceBranding", null);
__decorate([
    (0, common_1.Get)('preview/html'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.preview']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('templateId')),
    __param(2, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "previewHtml", null);
__decorate([
    (0, common_1.Get)('preview/pdf'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceTemplates.preview']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Query)('templateId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "previewPdf", null);
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
], InvoiceTemplatesController.prototype, "generateForInvoice", null);
__decorate([
    (0, common_1.Post)('branding/logo'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoiceBranding.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_invoice_logo_dto_1.UpdateInvoiceLogoDto, String]),
    __metadata("design:returntype", Promise)
], InvoiceTemplatesController.prototype, "uploadInvoiceBrandingLogo", null);
exports.InvoiceTemplatesController = InvoiceTemplatesController = __decorate([
    (0, common_1.Controller)('invoice-templates'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [invoice_templates_service_1.InvoiceTemplatesService,
        invoice_pdf_service_1.InvoicePdfService])
], InvoiceTemplatesController);
//# sourceMappingURL=invoice-templates.controller.js.map