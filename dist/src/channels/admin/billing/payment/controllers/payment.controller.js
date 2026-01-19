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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../../infrastructure/interceptor/base.controller");
const paystack_success_dto_1 = require("../dto/paystack-success.dto");
const payment_list_dto_1 = require("../dto/payment-list.dto");
const finalize_bank_transfer_dto_1 = require("../dto/finalize-bank-transfer.dto");
const payment_service_1 = require("../../../../../domains/billing/payment/services/payment.service");
const payment_receipt_service_1 = require("../../../../../domains/billing/payment/services/payment-receipt.service");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../common/decorator/current-user.decorator");
let PaymentController = class PaymentController extends base_controller_1.BaseController {
    constructor(paymentsService, receipts) {
        super();
        this.paymentsService = paymentsService;
        this.receipts = receipts;
    }
    async handlePaystackSuccess(user, dto) {
        return this.paymentsService.handlePaystackSuccess(dto, user.companyId, user.id);
    }
    listPayments(user, query) {
        return this.paymentsService.listPayments(user.companyId, query);
    }
    async finalizeBankTransfer(user, dto) {
        const result = await this.paymentsService.finalizePendingBankTransferPayment(dto, user.companyId, user.id);
        if (result?.receipt?.paymentId) {
            await this.receipts.generateReceiptPdfUrl(user.companyId, result.receipt.paymentId);
        }
        return { data: result };
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('paystack/success'),
    (0, common_1.SetMetadata)('permissions', ['billing.payments.paystack']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, paystack_success_dto_1.PaystackSuccessDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handlePaystackSuccess", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, payment_list_dto_1.ListPaymentsQueryDto]),
    __metadata("design:returntype", void 0)
], PaymentController.prototype, "listPayments", null);
__decorate([
    (0, common_1.Post)('admin/payments/bank-transfer/finalize'),
    (0, common_1.SetMetadata)('permissions', ['payments.write']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, finalize_bank_transfer_dto_1.FinalizeBankTransferPaymentDto]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "finalizeBankTransfer", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payment_service_1.PaymentService,
        payment_receipt_service_1.PaymentReceiptService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map