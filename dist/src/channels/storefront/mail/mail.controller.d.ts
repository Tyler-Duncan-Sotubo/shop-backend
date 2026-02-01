import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { MailService } from 'src/domains/mail/mail.service';
export declare class MailController {
    private readonly mailService;
    constructor(mailService: MailService);
    createSubscriberPublic(companyId: string, storeId: string, dto: CreateSubscriberDto, ip: string): Promise<{
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        email: string;
        storeId: string | null;
        metadata: Record<string, any> | null;
        source: string | null;
    }>;
    createContactMessagePublic(companyId: string, storeId: string, dto: CreateContactMessageDto, ip: string): Promise<{
        message: string;
        status: string;
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        email: string;
        storeId: string | null;
        phone: string | null;
        metadata: {
            [k: string]: any;
            ip?: string;
            userAgent?: string;
            pageUrl?: string;
            referrer?: string;
        } | null;
        company: string | null;
        subject: string | null;
    }>;
}
