import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { BillingPaystackService } from './billing-paystack.service';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreditService } from "../../credits/credits.service";
export declare class SubscriptionPaymentService {
    private readonly db;
    private readonly billingPaystack;
    private readonly subscriptions;
    private readonly plans;
    private readonly credits;
    private readonly logger;
    constructor(db: db, billingPaystack: BillingPaystackService, subscriptions: CompanySubscriptionsService, plans: SubscriptionPlansService, credits: CreditService);
    initiate(companyId: string, userEmail: string, planId: string, billingCycle: 'monthly' | 'annual'): Promise<{
        reference: string;
        authorizationUrl: any;
        accessCode: any;
        planName: string;
        amountNGN: number;
        billingCycle: "monthly" | "annual";
    }>;
    confirm(companyId: string, planId: string, billingCycle: 'monthly' | 'annual', paystackReference: string, amountNGN: number, paystackCustomerCode?: string): Promise<void>;
    verifyAndConfirm(companyId: string, reference: string): Promise<void>;
    initiateRenewal(companyId: string, userEmail: string): Promise<{
        reference: string;
        authorizationUrl: string;
    }>;
}
