import { ResendProvider } from '../resend.provider';
import { QuoteNotificationItem } from '../templates/quote-notification.html';
interface QuoteNotificationPayload {
    to: string | string[];
    fromName?: string;
    storeName?: string;
    customerEmail: string;
    customerName?: string;
    quoteId: string;
    customerNote?: string | null;
    items: QuoteNotificationItem[];
}
export declare class QuoteNotificationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendQuoteNotification(payload: QuoteNotificationPayload): Promise<void>;
}
export {};
