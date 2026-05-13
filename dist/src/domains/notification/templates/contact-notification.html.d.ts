export interface ContactNotificationTemplateData {
    storeName?: string | null;
    createdAt?: string | null;
    customerName?: string | null;
    customerEmail: string;
    phone?: string | null;
    company?: string | null;
    subject?: string | null;
    message: string;
    adminUrl?: string | null;
}
export declare const contactNotificationHtml: (d: ContactNotificationTemplateData) => string;
