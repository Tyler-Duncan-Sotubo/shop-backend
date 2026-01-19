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
exports.PaymentReceiptController = void 0;
const common_1 = require("@nestjs/common");
const current_company_id_decorator_1 = require("../../../common/decorators/current-company-id.decorator");
const storefront_guard_1 = require("../../../common/guard/storefront.guard");
const payment_receipt_service_1 = require("../../../../../domains/billing/payment/services/payment-receipt.service");
let PaymentReceiptController = class PaymentReceiptController {
    constructor(receipts) {
        this.receipts = receipts;
    }
    async getReceiptStorefront(companyId, paymentId) {
        const data = await this.receipts.getReceiptViewModel(companyId, paymentId);
        return { data };
    }
    async generateReceiptPdfStorefront(companyId, paymentId) {
        const generated = await this.receipts.generateReceiptPdfUrl(companyId, paymentId);
        await this.receipts.attachPdfToReceiptByPaymentId(companyId, paymentId, generated.pdfUrl, generated.storageKey);
        return { data: generated };
    }
};
exports.PaymentReceiptController = PaymentReceiptController;
__decorate([
    (0, common_1.Get)('storefront/:paymentId/receipt'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentReceiptController.prototype, "getReceiptStorefront", null);
__decorate([
    (0, common_1.Post)('storefront/:paymentId/receipt/pdf'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('paymentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PaymentReceiptController.prototype, "generateReceiptPdfStorefront", null);
exports.PaymentReceiptController = PaymentReceiptController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [payment_receipt_service_1.PaymentReceiptService])
], PaymentReceiptController);
//# sourceMappingURL=storefront-payment-receipt.controller.js.map