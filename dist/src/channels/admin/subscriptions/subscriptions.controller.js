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
exports.BillingWebhookController = exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorator/current-user.decorator");
const subscription_plans_service_1 = require("../../../domains/subscriptions/services/subscription-plans.service");
const company_subscriptions_service_1 = require("../../../domains/subscriptions/services/company-subscriptions.service");
const credit_topup_service_1 = require("../../../domains/subscriptions/services/credit-topup.service");
const subscription_webhook_service_1 = require("../../../domains/subscriptions/services/subscription-webhook.service");
const subscription_invoices_service_1 = require("../../../domains/subscriptions/services/subscription-invoices.service");
const subscription_payment_service_1 = require("../../../domains/subscriptions/services/subscription-payment.service");
const subscriptions_dto_1 = require("./dto/subscriptions.dto");
const billing_summary_service_1 = require("../../../domains/subscriptions/services/billing-summary.service");
let SubscriptionsController = class SubscriptionsController extends base_controller_1.BaseController {
    constructor(plans, subscriptions, topup, invoices, subscriptionPayment, billingSummary) {
        super();
        this.plans = plans;
        this.subscriptions = subscriptions;
        this.topup = topup;
        this.invoices = invoices;
        this.subscriptionPayment = subscriptionPayment;
        this.billingSummary = billingSummary;
    }
    getPlans() {
        return this.plans.getAll();
    }
    getMySubscription(user) {
        return this.subscriptions.getWithPlan(user.companyId);
    }
    cancelSubscription(user, body) {
        return this.subscriptions.cancel(user.companyId, body.reason);
    }
    initiateSubscription(user, body) {
        return this.subscriptionPayment.initiate(user.companyId, user.email, body.planId, body.billingCycle);
    }
    verifySubscription(user, body) {
        return this.subscriptionPayment.verifyAndConfirm(user.companyId, body.reference);
    }
    renewSubscription(user) {
        return this.subscriptionPayment.initiateRenewal(user.companyId, user.email);
    }
    getInvoices(user) {
        return this.invoices.getByCompany(user.companyId);
    }
    getBundles() {
        return this.topup.getBundles();
    }
    initiateTopup(user, body) {
        return this.topup.initiate(user.companyId, user.email, body.credits);
    }
    verifyTopup(user, body) {
        return this.topup.verifyAndConfirm(user.companyId, body.reference);
    }
    getTopupHistory(user) {
        return this.topup.getHistory(user.companyId);
    }
    getBillingSummary(user) {
        return this.billingSummary.get(user.companyId);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Get)('plans'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getPlans", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getMySubscription", null);
__decorate([
    (0, common_1.Post)('cancel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscriptions_dto_1.CancelSubscriptionDto]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Post)('initiate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscriptions_dto_1.InitiateSubscriptionDto]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "initiateSubscription", null);
__decorate([
    (0, common_1.Post)('verify'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscriptions_dto_1.VerifyTopupDto]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "verifySubscription", null);
__decorate([
    (0, common_1.Post)('renew'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "renewSubscription", null);
__decorate([
    (0, common_1.Get)('invoices'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getInvoices", null);
__decorate([
    (0, common_1.Get)('credits/bundles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getBundles", null);
__decorate([
    (0, common_1.Post)('credits/initiate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscriptions_dto_1.InitiateTopupDto]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "initiateTopup", null);
__decorate([
    (0, common_1.Post)('credits/verify'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, subscriptions_dto_1.VerifyTopupDto]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "verifyTopup", null);
__decorate([
    (0, common_1.Get)('credits/history'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getTopupHistory", null);
__decorate([
    (0, common_1.Get)('billing-summary'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SubscriptionsController.prototype, "getBillingSummary", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [subscription_plans_service_1.SubscriptionPlansService,
        company_subscriptions_service_1.CompanySubscriptionsService,
        credit_topup_service_1.CreditTopupService,
        subscription_invoices_service_1.SubscriptionInvoicesService,
        subscription_payment_service_1.SubscriptionPaymentService,
        billing_summary_service_1.BillingSummaryService])
], SubscriptionsController);
let BillingWebhookController = class BillingWebhookController extends base_controller_1.BaseController {
    constructor(webhookService) {
        super();
        this.webhookService = webhookService;
    }
    async handleWebhook(req, signature) {
        const rawBody = req.rawBody;
        const { event } = this.webhookService.processWebhook(rawBody, signature);
        await this.webhookService.handleEvent(event);
        return { received: true };
    }
};
exports.BillingWebhookController = BillingWebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('x-paystack-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BillingWebhookController.prototype, "handleWebhook", null);
exports.BillingWebhookController = BillingWebhookController = __decorate([
    (0, common_1.Controller)('webhooks/paystack/billing'),
    __metadata("design:paramtypes", [subscription_webhook_service_1.SubscriptionWebhookService])
], BillingWebhookController);
//# sourceMappingURL=subscriptions.controller.js.map