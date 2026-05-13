import { ResendProvider } from '../resend.provider';
interface ContactNotificationPayload {
    to: string | string[];
    fromName?: string;
    customerName?: string;
    customerEmail: string;
    subject: string;
    message: string;
    phone?: string;
    company?: string;
    storeName?: string;
    createdAt?: string;
    adminUrl?: string;
}
export declare class ContactNotificationService {
    private readonly resend;
    constructor(resend: ResendProvider);
    sendContactNotification(payload: ContactNotificationPayload): Promise<void>;
}
export {};
