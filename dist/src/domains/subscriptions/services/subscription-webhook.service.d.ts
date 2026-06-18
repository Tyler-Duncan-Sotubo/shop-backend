import { CreditTopupService } from './credit-topup.service';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { CreditService } from "../../credits/credits.service";
import { SubscriptionPlansService } from './subscription-plans.service';
import { BillingPaystackService } from './billing-paystack.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
export declare class SubscriptionWebhookService {
    private readonly topup;
    private readonly subscriptions;
    private readonly credits;
    private readonly plans;
    private readonly billingPaystack;
    private readonly subscriptionPayment;
    private readonly logger;
    constructor(topup: CreditTopupService, subscriptions: CompanySubscriptionsService, credits: CreditService, plans: SubscriptionPlansService, billingPaystack: BillingPaystackService, subscriptionPayment: SubscriptionPaymentService);
    processWebhook(rawBody: Buffer, signature: string): {
        valid: boolean;
        event: any;
        reference: any;
        status: any;
        amountNGN: number | null;
        currency: any;
        metadata: any;
        raw: any;
    };
    handleEvent(event: any): Promise<void>;
    private handleSubscriptionRenewal;
    private topUpPlanCredits;
}
