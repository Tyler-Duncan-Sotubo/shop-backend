import { RawBodyRequest } from '@nestjs/common';
import { BaseController } from "../../../infrastructure/interceptor/base.controller";
import { User } from "../common/types/user.type";
import { SubscriptionPlansService } from "../../../domains/subscriptions/services/subscription-plans.service";
import { CompanySubscriptionsService } from "../../../domains/subscriptions/services/company-subscriptions.service";
import { CreditTopupService } from "../../../domains/subscriptions/services/credit-topup.service";
import { SubscriptionWebhookService } from "../../../domains/subscriptions/services/subscription-webhook.service";
import { SubscriptionInvoicesService } from "../../../domains/subscriptions/services/subscription-invoices.service";
import { SubscriptionPaymentService } from "../../../domains/subscriptions/services/subscription-payment.service";
import { CancelSubscriptionDto, InitiateTopupDto, InitiateSubscriptionDto, VerifyTopupDto } from './dto/subscriptions.dto';
import { Request } from 'express';
import { BillingSummaryService } from "../../../domains/subscriptions/services/billing-summary.service";
export declare class SubscriptionsController extends BaseController {
    private readonly plans;
    private readonly subscriptions;
    private readonly topup;
    private readonly invoices;
    private readonly subscriptionPayment;
    private readonly billingSummary;
    constructor(plans: SubscriptionPlansService, subscriptions: CompanySubscriptionsService, topup: CreditTopupService, invoices: SubscriptionInvoicesService, subscriptionPayment: SubscriptionPaymentService, billingSummary: BillingSummaryService);
    getPlans(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        monthlyPriceNGN: number;
        annualPriceNGN: number;
        monthlyCredits: number;
        features: import("../../../infrastructure/drizzle/schema").PlanFeatures;
        paystackMonthlyPlanCode: string | null;
        paystackAnnualPlanCode: string | null;
        isActive: boolean;
        sortOrder: number;
    }[]>;
    getMySubscription(user: User): Promise<{
        plan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            monthlyPriceNGN: number;
            annualPriceNGN: number;
            monthlyCredits: number;
            features: import("../../../infrastructure/drizzle/schema").PlanFeatures;
            paystackMonthlyPlanCode: string | null;
            paystackAnnualPlanCode: string | null;
            isActive: boolean;
            sortOrder: number;
        };
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        planId: string;
        status: "active" | "trialing" | "past_due" | "cancelled" | "expired";
        billingCycle: "monthly" | "annual";
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialEndsAt: Date | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
        paystackCustomerCode: string | null;
        paystackSubscriptionCode: string | null;
        paystackEmailToken: string | null;
    } | null>;
    cancelSubscription(user: User, body: CancelSubscriptionDto): Promise<void>;
    initiateSubscription(user: User, body: InitiateSubscriptionDto): Promise<{
        reference: string;
        authorizationUrl: any;
        accessCode: any;
        planName: string;
        amountNGN: number;
        billingCycle: "monthly" | "annual";
    }>;
    verifySubscription(user: User, body: VerifyTopupDto): Promise<void>;
    renewSubscription(user: User): Promise<{
        reference: string;
        authorizationUrl: string;
    }>;
    getInvoices(user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        subscriptionId: string | null;
        topupRequestId: string | null;
        type: "subscription" | "credit_topup";
        status: "paid" | "failed" | "refunded";
        amountNGN: number;
        paystackReference: string | null;
        paidAt: Date | null;
    }[]>;
    getBundles(): readonly [{
        readonly credits: 1000;
        readonly amountNGN: 3000;
        readonly label: "1,000 credits";
    }, {
        readonly credits: 5000;
        readonly amountNGN: 12500;
        readonly label: "5,000 credits";
    }, {
        readonly credits: 10000;
        readonly amountNGN: 22000;
        readonly label: "10,000 credits";
    }, {
        readonly credits: 25000;
        readonly amountNGN: 50000;
        readonly label: "25,000 credits";
    }];
    initiateTopup(user: User, body: InitiateTopupDto): Promise<{
        reference: string;
        authorizationUrl: any;
        accessCode: any;
        credits: 10000 | 5000 | 1000 | 25000;
        amountNGN: 3000 | 12500 | 22000 | 50000;
    }>;
    verifyTopup(user: User, body: VerifyTopupDto): Promise<void>;
    getTopupHistory(user: User): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        credits: number;
        amountNGN: number;
        status: "paid" | "pending" | "failed" | "refunded";
        paystackReference: string;
        paystackAccessCode: string | null;
        paidAt: Date | null;
        metadata: unknown;
    }[]>;
    getBillingSummary(user: User): Promise<{
        subscription: {
            plan: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                monthlyPriceNGN: number;
                annualPriceNGN: number;
                monthlyCredits: number;
                features: import("../../../infrastructure/drizzle/schema").PlanFeatures;
                paystackMonthlyPlanCode: string | null;
                paystackAnnualPlanCode: string | null;
                isActive: boolean;
                sortOrder: number;
            };
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            planId: string;
            status: "active" | "trialing" | "past_due" | "cancelled" | "expired";
            billingCycle: "monthly" | "annual";
            currentPeriodStart: Date | null;
            currentPeriodEnd: Date | null;
            trialEndsAt: Date | null;
            cancelledAt: Date | null;
            cancelReason: string | null;
            paystackCustomerCode: string | null;
            paystackSubscriptionCode: string | null;
            paystackEmailToken: string | null;
        } | null;
        plans: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            monthlyPriceNGN: number;
            annualPriceNGN: number;
            monthlyCredits: number;
            features: import("../../../infrastructure/drizzle/schema").PlanFeatures;
            paystackMonthlyPlanCode: string | null;
            paystackAnnualPlanCode: string | null;
            isActive: boolean;
            sortOrder: number;
        }[];
        topups: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            credits: number;
            amountNGN: number;
            status: "paid" | "pending" | "failed" | "refunded";
            paystackReference: string;
            paystackAccessCode: string | null;
            paidAt: Date | null;
            metadata: unknown;
        }[];
        invoices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            companyId: string;
            subscriptionId: string | null;
            topupRequestId: string | null;
            type: "subscription" | "credit_topup";
            status: "paid" | "failed" | "refunded";
            amountNGN: number;
            paystackReference: string | null;
            paidAt: Date | null;
        }[];
    }>;
}
export declare class BillingWebhookController extends BaseController {
    private readonly webhookService;
    constructor(webhookService: SubscriptionWebhookService);
    handleWebhook(req: RawBodyRequest<Request>, signature: string): Promise<{
        received: boolean;
    }>;
}
