export interface SubscriptionPastDueTemplateData {
    companyName: string;
    ownerName: string;
    planName: string;
    fixPaymentUrl: string;
    daysUntilExpiry: number;
}
export declare const subscriptionPastDueHtml: (d: SubscriptionPastDueTemplateData) => string;
