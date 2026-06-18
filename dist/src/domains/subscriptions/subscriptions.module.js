"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const credits_module_1 = require("../credits/credits.module");
const subscription_plans_service_1 = require("./services/subscription-plans.service");
const company_subscriptions_service_1 = require("./services/company-subscriptions.service");
const credit_topup_service_1 = require("./services/credit-topup.service");
const subscription_webhook_service_1 = require("./services/subscription-webhook.service");
const subscription_cron_service_1 = require("./services/subscription-cron.service");
const billing_paystack_service_1 = require("./services/billing-paystack.service");
const subscription_invoices_service_1 = require("./services/subscription-invoices.service");
const subscription_payment_service_1 = require("./services/subscription-payment.service");
let SubscriptionsModule = class SubscriptionsModule {
};
exports.SubscriptionsModule = SubscriptionsModule;
exports.SubscriptionsModule = SubscriptionsModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule, credits_module_1.CreditModule],
        providers: [
            subscription_plans_service_1.SubscriptionPlansService,
            company_subscriptions_service_1.CompanySubscriptionsService,
            credit_topup_service_1.CreditTopupService,
            subscription_webhook_service_1.SubscriptionWebhookService,
            subscription_cron_service_1.SubscriptionCronService,
            billing_paystack_service_1.BillingPaystackService,
            subscription_invoices_service_1.SubscriptionInvoicesService,
            subscription_payment_service_1.SubscriptionPaymentService,
        ],
        exports: [
            subscription_plans_service_1.SubscriptionPlansService,
            company_subscriptions_service_1.CompanySubscriptionsService,
            credit_topup_service_1.CreditTopupService,
            subscription_webhook_service_1.SubscriptionWebhookService,
            billing_paystack_service_1.BillingPaystackService,
            subscription_invoices_service_1.SubscriptionInvoicesService,
            subscription_payment_service_1.SubscriptionPaymentService,
        ],
    })
], SubscriptionsModule);
//# sourceMappingURL=subscriptions.module.js.map