import { User } from 'src/channels/admin/common/types/user.type';
import { ListSubscribersQueryDto } from './dto/list-subscribers.query.dto';
import { UpdateSubscriberStatusDto } from './dto/update-subscriber-status.dto';
import { ListContactMessagesQueryDto } from './dto/list-contact-messages.query.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-status.dto';
import { MailService } from 'src/domains/mail/mail.service';
declare class IdParamDto {
    id: string;
}
export declare class MailController {
    private readonly mailService;
    constructor(mailService: MailService);
    listSubscribersAdmin(user: User, query: ListSubscribersQueryDto): Promise<{
        data: {
            id: string;
            email: string;
            status: string;
            source: string | null;
            storeId: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getSubscriberAdmin(user: User, params: IdParamDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        email: string;
        storeId: string | null;
        status: string;
        metadata: Record<string, any> | null;
        source: string | null;
    }>;
    updateSubscriberStatusAdmin(user: User, params: IdParamDto, dto: UpdateSubscriberStatusDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        email: string;
        status: string;
        source: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    listContactMessagesAdmin(user: User, query: ListContactMessagesQueryDto): Promise<{
        rows: {
            id: string;
            storeId: string | null;
            subject: string | null;
            name: string | null;
            email: string;
            phone: string | null;
            company: string | null;
            message: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
        }[];
        count: number;
        page: number;
        limit: number;
        offset: number;
    }>;
    getContactMessageAdmin(user: User, params: IdParamDto): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        email: string;
        storeId: string | null;
        phone: string | null;
        status: string;
        metadata: {
            [k: string]: any;
            ip?: string;
            userAgent?: string;
            pageUrl?: string;
            referrer?: string;
        } | null;
        message: string;
        company: string | null;
        subject: string | null;
    }>;
    updateContactMessageStatusAdmin(user: User, params: IdParamDto, dto: UpdateContactMessageStatusDto): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string | null;
        email: string;
        phone: string | null;
        message: string;
        company: string | null;
        status: string;
        subject: string | null;
        metadata: {
            [k: string]: any;
            ip?: string;
            userAgent?: string;
            pageUrl?: string;
            referrer?: string;
        } | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
export {};
