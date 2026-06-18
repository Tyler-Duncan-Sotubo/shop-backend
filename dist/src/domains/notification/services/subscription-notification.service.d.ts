import { ResendProvider } from '../resend.provider';
export declare class SubscriptionNotificationService {
    private readonly resend;
    private readonly logger;
    constructor(resend: ResendProvider);
    sendTrialEnding(input: {
        email: string;
        ownerName: string;
        companyName: string;
        daysLeft: number;
        trialEndsAt: Date;
    }): Promise<void>;
    sendPastDue(input: {
        email: string;
        ownerName: string;
        companyName: string;
        planName: string;
        daysUntilExpiry: number;
    }): Promise<void>;
}
