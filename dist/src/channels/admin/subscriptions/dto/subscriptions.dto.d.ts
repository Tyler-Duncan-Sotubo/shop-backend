export declare class InitiateSubscriptionDto {
    planId: string;
    billingCycle: 'monthly' | 'annual';
}
export declare class InitiateTopupDto {
    credits: number;
}
export declare class VerifyTopupDto {
    reference: string;
}
export declare class CancelSubscriptionDto {
    reason?: string;
}
