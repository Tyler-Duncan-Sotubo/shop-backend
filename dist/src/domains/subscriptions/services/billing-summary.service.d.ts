import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { SubscriptionPlansService } from './subscription-plans.service';
export declare class BillingSummaryService {
    private readonly db;
    private readonly plans;
    constructor(db: db, plans: SubscriptionPlansService);
    get(companyId: string): Promise<{
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
                features: import("src/infrastructure/drizzle/schema").PlanFeatures;
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
            status: "active" | "expired" | "trialing" | "past_due" | "cancelled";
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
            features: import("src/infrastructure/drizzle/schema").PlanFeatures;
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
