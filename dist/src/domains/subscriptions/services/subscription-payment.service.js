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
var SubscriptionPaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionPaymentService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const billing_paystack_service_1 = require("./billing-paystack.service");
const company_subscriptions_service_1 = require("./company-subscriptions.service");
const subscription_plans_service_1 = require("./subscription-plans.service");
const credits_service_1 = require("../../credits/credits.service");
const nanoid_1 = require("nanoid");
let SubscriptionPaymentService = SubscriptionPaymentService_1 = class SubscriptionPaymentService {
    constructor(db, billingPaystack, subscriptions, plans, credits) {
        this.db = db;
        this.billingPaystack = billingPaystack;
        this.subscriptions = subscriptions;
        this.plans = plans;
        this.credits = credits;
        this.logger = new common_1.Logger(SubscriptionPaymentService_1.name);
    }
    async initiate(companyId, userEmail, planId, billingCycle) {
        const [plan] = await this.db
            .select()
            .from(schema_1.subscriptionPlans)
            .where((0, drizzle_orm_1.eq)(schema_1.subscriptionPlans.id, planId))
            .limit(1)
            .execute();
        if (!plan)
            throw new common_1.BadRequestException('Plan not found.');
        if (plan.name === 'Custom' || plan.name === 'Free') {
            throw new common_1.BadRequestException('This plan cannot be purchased online.');
        }
        const amountNGN = billingCycle === 'annual' ? plan.annualPriceNGN : plan.monthlyPriceNGN;
        if (amountNGN <= 0) {
            throw new common_1.BadRequestException('Invalid plan amount.');
        }
        const reference = `SUB-${(0, nanoid_1.nanoid)(12).toUpperCase()}`;
        const result = await this.billingPaystack.initializeTransaction({
            email: userEmail,
            amountNGN,
            reference,
            callbackUrl: `${process.env.FRONTEND_URL}/billing?sub=success`,
            metadata: {
                companyId,
                planId,
                planName: plan.name,
                billingCycle,
                type: 'subscription_payment',
            },
        });
        this.logger.log(`[SubscriptionPayment] Initiated ${plan.name} ${billingCycle} for company ${companyId} ref: ${reference}`);
        return {
            reference,
            authorizationUrl: result.data.authorizationUrl,
            accessCode: result.data.accessCode,
            planName: plan.name,
            amountNGN,
            billingCycle,
        };
    }
    async confirm(companyId, planId, billingCycle, paystackReference, amountNGN, paystackCustomerCode) {
        await this.subscriptions.activate(companyId, planId, billingCycle, undefined, paystackCustomerCode, undefined);
        const plan = await this.plans.getById(planId);
        if (plan.monthlyCredits > 0) {
            await this.credits.topUp(companyId, plan.monthlyCredits, 'email', `Plan credits — ${plan.name}`);
        }
        await this.db
            .insert(schema_1.subscriptionInvoices)
            .values({
            companyId,
            type: 'subscription',
            status: 'paid',
            amountNGN,
            paystackReference,
            paidAt: new Date(),
        })
            .execute();
        this.logger.log(`[SubscriptionPayment] Confirmed ${plan.name} for company ${companyId}`);
    }
    async verifyAndConfirm(companyId, reference) {
        const result = await this.billingPaystack.verifyTransaction(reference);
        if (!result.verified) {
            throw new common_1.BadRequestException(`Payment not verified. Status: ${result.status}`);
        }
        const meta = result.metadata;
        const planId = meta?.planId;
        const billingCycle = meta?.billingCycle ?? 'monthly';
        const amountNGN = result.amountNGN ?? 0;
        const paystackCustomerCode = result.customer?.customer_code ?? undefined;
        if (!planId) {
            throw new common_1.BadRequestException('Plan ID missing from payment metadata.');
        }
        await this.confirm(companyId, planId, billingCycle, reference, amountNGN, paystackCustomerCode);
    }
    async initiateRenewal(companyId, userEmail) {
        const sub = await this.subscriptions.getByCompanyOrThrow(companyId);
        const plan = await this.plans.getById(sub.planId);
        if (plan.name === 'Custom' || plan.name === 'Free') {
            throw new common_1.BadRequestException('This plan cannot be renewed online.');
        }
        const amountNGN = sub.billingCycle === 'annual'
            ? plan.annualPriceNGN
            : plan.monthlyPriceNGN;
        if (amountNGN <= 0) {
            throw new common_1.BadRequestException('Invalid plan amount.');
        }
        const reference = `REN-${(0, nanoid_1.nanoid)(12).toUpperCase()}`;
        const result = await this.billingPaystack.initializeTransaction({
            email: userEmail,
            amountNGN,
            reference,
            callbackUrl: `${process.env.FRONTEND_URL}/billing?sub=success`,
            metadata: {
                companyId,
                planId: sub.planId,
                planName: plan.name,
                billingCycle: sub.billingCycle,
                type: 'subscription_payment',
            },
        });
        this.logger.log(`[SubscriptionPayment] Renewal initiated ${plan.name} for company ${companyId} ref: ${reference}`);
        return {
            reference,
            authorizationUrl: result.data.authorizationUrl,
        };
    }
};
exports.SubscriptionPaymentService = SubscriptionPaymentService;
exports.SubscriptionPaymentService = SubscriptionPaymentService = SubscriptionPaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, billing_paystack_service_1.BillingPaystackService,
        company_subscriptions_service_1.CompanySubscriptionsService,
        subscription_plans_service_1.SubscriptionPlansService,
        credits_service_1.CreditService])
], SubscriptionPaymentService);
//# sourceMappingURL=subscription-payment.service.js.map