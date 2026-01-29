import { ConfigService } from '@nestjs/config';
export interface QuoteNotificationItem {
    name: string;
    quantity?: number;
}
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
    private readonly config;
    constructor(config: ConfigService);
    sendQuoteNotification(payload: QuoteNotificationPayload): Promise<void>;
}
export {};
