import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { MailService } from 'src/domains/mail/mail.service';
export declare class MailController {
    private readonly mailService;
    constructor(mailService: MailService);
    createSubscriberPublic(companyId: string, storeId: string, dto: CreateSubscriberDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string | null;
        email: string;
        status: string;
        source: string | null;
        metadata: Record<string, any> | null;
    }>;
    createContactMessagePublic(companyId: string, storeId: string, dto: CreateContactMessageDto, ip: string): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string | null;
        email: string;
        status: string;
        metadata: {
            [k: string]: any;
            ip?: string;
            userAgent?: string;
            pageUrl?: string;
            referrer?: string;
        } | null;
        phone: string | null;
        message: string;
        company: string | null;
        subject: string | null;
    }>;
}
