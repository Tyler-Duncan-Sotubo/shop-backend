import { ConfigService } from '@nestjs/config';
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
}
export declare class ContactNotificationService {
    private readonly config;
    constructor(config: ConfigService);
    sendContactNotification(payload: ContactNotificationPayload): Promise<void>;
}
export {};
