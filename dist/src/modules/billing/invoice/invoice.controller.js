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
exports.InvoiceController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const invoice_service_1 = require("./invoice.service");
const create_invoice_from_order_dto_1 = require("./dto/create-invoice-from-order.dto");
const invoice_id_param_dto_1 = require("./dto/invoice-id.param.dto");
const issue_invoice_dto_1 = require("./dto/issue-invoice.dto");
const invoice_line_id_param_dto_1 = require("./dto/invoice-line-id.param.dto");
const update_invoice_line_dto_1 = require("./dto/update-invoice-line.dto");
const list_invoices_query_dto_1 = require("./dto/list-invoices.query.dto");
const update_invoice_draft_dto_1 = require("./dto/update-invoice-draft.dto");
let InvoiceController = class InvoiceController extends base_controller_1.BaseController {
    constructor(invoiceService) {
        super();
        this.invoiceService = invoiceService;
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
};
exports.InvoiceController = InvoiceController;
__decorate([
    (0, common_1.Post)('from-order'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.createFromOrder']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_invoice_from_order_dto_1.CreateInvoiceFromOrderDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "createDraftFromOrder", null);
__decorate([
    (0, common_1.Post)(':invoiceId/recalculate'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.recalculate']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_id_param_dto_1.InvoiceIdParamDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "recalculateDraftTotals", null);
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
], InvoiceController.prototype, "issueInvoice", null);
__decorate([
    (0, common_1.Get)(':invoiceId'),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, invoice_id_param_dto_1.InvoiceIdParamDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "getInvoice", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['billing.invoices.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_invoices_query_dto_1.ListInvoicesQueryDto]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "listInvoices", null);
__decorate([
    (0, common_1.Patch)(':invoiceId'),
    __param(0, (0, common_1.Param)('invoiceId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_invoice_draft_dto_1.UpdateInvoiceDraftDto, Object, String]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "updateDraftInvoice", null);
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
], InvoiceController.prototype, "updateDraftLine", null);
__decorate([
    (0, common_1.Post)('sync-invoice-series'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], InvoiceController.prototype, "syncInvoiceSeries", null);
exports.InvoiceController = InvoiceController = __decorate([
    (0, common_1.Controller)('invoices'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [invoice_service_1.InvoiceService])
], InvoiceController);
//# sourceMappingURL=invoice.controller.js.map