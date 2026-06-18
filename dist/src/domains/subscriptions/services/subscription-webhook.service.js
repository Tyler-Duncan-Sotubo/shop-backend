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
var SubscriptionWebhookService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionWebhookService = void 0;
const common_1 = require("@nestjs/common");
const credit_topup_service_1 = require("./credit-topup.service");
const company_subscriptions_service_1 = require("./company-subscriptions.service");
const credits_service_1 = require("../../credits/credits.service");
const subscription_plans_service_1 = require("./subscription-plans.service");
const billing_paystack_service_1 = require("./billing-paystack.service");
const subscription_payment_service_1 = require("./subscription-payment.service");
let SubscriptionWebhookService = SubscriptionWebhookService_1 = class SubscriptionWebhookService {
    constructor(topup, subscriptions, credits, plans, billingPaystack, subscriptionPayment) {
        this.topup = topup;
        this.subscriptions = subscriptions;
        this.credits = credits;
        this.plans = plans;
        this.billingPaystack = billingPaystack;
        this.subscriptionPayment = subscriptionPayment;
        this.logger = new common_1.Logger(SubscriptionWebhookService_1.name);
    }
    processWebhook(rawBody, signature) {
        return this.billingPaystack.processWebhook(rawBody, signature);
    }
    async handleEvent(event) {
        const type = event?.event;
        const data = event?.data;
        this.logger.log(`[SubscriptionWebhook] Event: ${type}`);
        switch (type) {
            case 'charge.success': {
                const meta = data?.metadata;
                if (meta?.type === 'credit_topup') {
                    await this.topup.confirm(data.reference);
                    break;
                }
                if (meta?.type === 'subscription_payment') {
                    const companyId = meta?.companyId;
                    const planId = meta?.planId;
                    const billingCycle = meta?.billingCycle ?? 'monthly';
                    const amountNGN = typeof data?.amount === 'number' ? data.amount / 100 : 0;
                    const paystackCustomerCode = data?.customer?.customer_code ?? undefined;
                    if (!companyId || !planId) {
                        this.logger.warn('[SubscriptionWebhook] subscription_payment — missing companyId or planId');
                        break;
                    }
                    await this.subscriptionPayment.confirm(companyId, planId, billingCycle, data.reference, amountNGN, paystackCustomerCode);
                    break;
                }
                this.logger.debug(`[SubscriptionWebhook] charge.success — unknown meta type: ${meta?.type}`);
                break;
            }
            case 'subscription.create': {
                const companyId = data?.metadata?.companyId;
                const planId = data?.metadata?.planId;
                const billingCycle = data?.metadata?.billingCycle ?? 'monthly';
                if (!companyId || !planId) {
                    this.logger.warn('[SubscriptionWebhook] subscription.create — missing companyId or planId');
                    break;
                }
                await this.subscriptions.activate(companyId, planId, billingCycle, data?.subscription_code, data?.customer?.customer_code, data?.email_token);
                await this.topUpPlanCredits(companyId, planId);
                break;
            }
            case 'invoice.payment_failed': {
                const companyId = data?.metadata?.companyId;
                if (!companyId) {
                    this.logger.warn('[SubscriptionWebhook] invoice.payment_failed — missing companyId');
                    break;
                }
                await this.subscriptions.markPastDue(companyId);
                this.logger.log(`[SubscriptionWebhook] Marked past_due: ${companyId}`);
                break;
            }
            case 'subscription.disable': {
                const companyId = data?.metadata?.companyId;
                if (!companyId) {
                    this.logger.warn('[SubscriptionWebhook] subscription.disable — missing companyId');
                    break;
                }
                await this.subscriptions.cancel(companyId, 'Subscription disabled via Paystack');
                this.logger.log(`[SubscriptionWebhook] Cancelled subscription: ${companyId}`);
                break;
            }
            default:
                this.logger.debug(`[SubscriptionWebhook] Unhandled event: ${type}`);
        }
    }
    async handleSubscriptionRenewal(data) {
        const companyId = data?.metadata?.companyId;
        if (!companyId) {
            this.logger.warn('[SubscriptionWebhook] renewal — missing companyId');
            return;
        }
        await this.subscriptions.renew(companyId);
        const sub = await this.subscriptions.getByCompany(companyId);
        if (sub) {
            await this.topUpPlanCredits(companyId, sub.planId);
        }
    }
    async topUpPlanCredits(companyId, planId) {
        const plan = await this.plans.getById(planId);
        if (!plan || plan.monthlyCredits === 0)
            return;
        await this.credits.topUp(companyId, plan.monthlyCredits, 'email', `Monthly plan credits — ${plan.name}`);
        this.logger.log(`[SubscriptionWebhook] Topped up ${plan.monthlyCredits} credits for company ${companyId} — plan: ${plan.name}`);
    }
};
exports.SubscriptionWebhookService = SubscriptionWebhookService;
exports.SubscriptionWebhookService = SubscriptionWebhookService = SubscriptionWebhookService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [credit_topup_service_1.CreditTopupService,
        company_subscriptions_service_1.CompanySubscriptionsService,
        credits_service_1.CreditService,
        subscription_plans_service_1.SubscriptionPlansService,
        billing_paystack_service_1.BillingPaystackService,
        subscription_payment_service_1.SubscriptionPaymentService])
], SubscriptionWebhookService);
//# sourceMappingURL=subscription-webhook.service.js.map