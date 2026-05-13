export interface QuoteNotificationItem {
    name: string;
    quantity: number;
    variantLabel?: string | null;
}
export interface QuoteNotificationTemplateData {
    storeName?: string | null;
    createdAt?: string | null;
    customerName?: string | null;
    customerEmail: string;
    phone?: string | null;
    company?: string | null;
    customerNote?: string | null;
    quoteId: string;
    adminUrl?: string | null;
    items: QuoteNotificationItem[];
}
export declare const quoteNotificationHtml: (d: QuoteNotificationTemplateData) => string;
