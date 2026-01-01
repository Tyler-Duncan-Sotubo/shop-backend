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
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const payment_service_1 = require("./payment.service");
const paystack_success_dto_1 = require("./dto/paystack-success.dto");
const payment_list_dto_1 = require("./dto/payment-list.dto");
let PaymentController = class PaymentController extends base_controller_1.BaseController {
    constructor(paymentsService) {
        super();
        this.paymentsService = paymentsService;
    }
    async handlePaystackSuccess(user, dto) {
        return this.paymentsService.handlePaystackSuccess(dto, user.companyId, user.id);
    }
    listPayments(user, query) {
        return this.paymentsService.listPayments(user.companyId, query);
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
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map