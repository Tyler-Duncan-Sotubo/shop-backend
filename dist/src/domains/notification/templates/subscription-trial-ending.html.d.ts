export interface SubscriptionTrialEndingTemplateData {
    companyName: string;
    ownerName: string;
    daysLeft: number;
    trialEndsAt: string;
    upgradePlanUrl: string;
}
export declare const subscriptionTrialEndingHtml: (d: SubscriptionTrialEndingTemplateData) => string;
