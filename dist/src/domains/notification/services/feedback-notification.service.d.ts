import { ResendProvider } from '../resend.provider';
interface FeedbackNotificationPayload {
    companyId: string;
    companyName: string;
    category: string;
    message: string;
    platform: string;
    submittedAt: string;
}
export declare class FeedbackNotificationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendFeedbackNotification(payload: FeedbackNotificationPayload): Promise<void>;
}
export {};
