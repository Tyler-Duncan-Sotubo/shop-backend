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
exports.AdminInvoiceController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const create_invoice_from_order_dto_1 = require("./dto/create-invoice-from-order.dto");
const invoice_id_param_dto_1 = require("./dto/invoice-id.param.dto");
const issue_invoice_dto_1 = require("./dto/issue-invoice.dto");
const invoice_line_id_param_dto_1 = require("./dto/invoice-line-id.param.dto");
const update_invoice_line_dto_1 = require("./dto/update-invoice-line.dto");
const list_invoices_query_dto_1 = require("./dto/list-invoices.query.dto");
const update_invoice_draft_dto_1 = require("./dto/update-invoice-draft.dto");
const record_invoice_payment_dto_1 = require("../payment/dto/record-invoice-payment.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const invoice_service_1 = require("../../../../domains/billing/invoice/invoice.service");
const payment_service_1 = require("../../../../domains/billing/payment/services/payment.service");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let AdminInvoiceController = class AdminInvoiceController extends base_controller_1.BaseController {
    constructor(invoiceService, paymentService) {
        super();
        this.invoiceService = invoiceService;
        this.paymentService = paymentService;
    }
    async createDraftFromOrder(user, dto) {
        return this.invoiceService.createDraftFromOrder(dto, user.companyId);
    }
    async recalculateDraftTotals(user, params) {
        return this.invoiceService.recalculateDraftTotals(user.companyId, params.invoiceId);
    }
    async issueInvoice(user, params, dto) {
        return this.invoiceService.issueInvoice(params.invoiceId, dto, user.companyId);
    }
    async getInvoice(user, params) {
        return this.invoiceService.getInvoiceWithLines(user.companyId, params.invoiceId);
    }
    async listInvoices(user, query) {
        return this.invoiceService.listInvoices(user.companyId, query);
    }
    async updateDraftInvoice(invoiceId, dto, user, ip) {
        const data = await this.invoiceService.updateDraftInvoice(user.companyId, invoiceId, dto, { userId: user.id, ip });
        return { data };
    }
    async updateDraftLine(user, params, dto, ip) {
        return this.invoiceService.updateDraftLineAndRecalculate(user.companyId, params.invoiceId, params.lineId, dto, { userId: user.id, ip });
    }
    async syncInvoiceSeries(user) {
        await this.invoiceService.seedDefaultInvoiceSeriesForCompany(user.companyId);
        return { message: 'Invoice series synchronized successfully.' };
    }
    async recordInvoicePayment(user, params, dto) {
        console.log('Recording payment for invoice:', dto);
        return this.paymentService.recordInvoicePayment({
            invoiceId: params.invoiceId,
            amount: dto.amount,
            currency: dto.currency,
            method: dto.method,
            reference: dto.reference ?? null,
            meta: dto.meta ?? null,
            evidenceDataUrl: dto.evidenceDataUrl,
            evidenceFileName: dto.evidenceFileName,
            evidenceNote: dto.evidenceNote,
        }, user.companyId, user.id);
    }
};
exports.AdminInvoiceController = AdminInvoiceController;
__decorate([
    (0, common_1.Post)('from-order'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.createFromOrder']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_invoice_from_order_dto_1.CreateInvoiceFromOrderDto]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "createDraftFromOrder", null);
__decorate([
    (0, common_1.Post)(':invoiceId/recalculate'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.recalculate']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_id_param_dto_1.InvoiceIdParamDto]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "recalculateDraftTotals", null);
__decorate([
    (0, common_1.Post)(':invoiceId/issue'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.issue']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_id_param_dto_1.InvoiceIdParamDto,
        issue_invoice_dto_1.IssueInvoiceDto]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "issueInvoice", null);
__decorate([
    (0, common_1.Get)(':invoiceId'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_id_param_dto_1.InvoiceIdParamDto]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_invoices_query_dto_1.ListInvoicesQueryDto]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.Patch)(':invoiceId'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_invoice_draft_dto_1.UpdateInvoiceDraftDto, Object, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "updateDraftInvoice", null);
__decorate([
    (0, common_1.Patch)(':invoiceId/lines/:lineId'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.updateDraft']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_line_id_param_dto_1.InvoiceLineIdParamDto,
        update_invoice_line_dto_1.UpdateInvoiceLineDto, String]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "updateDraftLine", null);
__decorate([
    (0, common_1.Post)('sync-invoice-series'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "syncInvoiceSeries", null);
__decorate([
    (0, common_1.Post)(':invoiceId/payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_id_param_dto_1.InvoiceIdParamDto,
        record_invoice_payment_dto_1.RecordInvoicePaymentDto]),
    __metadata("design:returntype", Promise)
], AdminInvoiceController.prototype, "recordInvoicePayment", null);
exports.AdminInvoiceController = AdminInvoiceController = __decorate([
    (0, common_1.Controller)('invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [invoice_service_1.InvoiceService,
        payment_service_1.PaymentService])
], AdminInvoiceController);
//# sourceMappingURL=invoice.controller.js.map