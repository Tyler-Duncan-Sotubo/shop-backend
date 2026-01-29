import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { MailService } from 'src/domains/mail/mail.service';
export declare class MailController {
    private readonly mailService;
    constructor(mailService: MailService);
    createSubscriberPublic(companyId: string, storeId: string, dto: CreateSubscriberDto, ip: string): Promise<{
        metadata: Record<string, any> | null;
        id: string;
        storeId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        email: string;
        source: string | null;
    }>;
    createContactMessagePublic(companyId: string, storeId: string, dto: CreateContactMessageDto, ip: string): Promise<{
        metadata: {
            [k: string]: any;
            ip?: string;
            userAgent?: string;
            pageUrl?: string;
            referrer?: string;
        } | null;
        name: string | null;
        id: string;
        storeId: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        email: string;
        phone: string | null;
        message: string;
        company: string | null;
        subject: string | null;
    }>;
}
