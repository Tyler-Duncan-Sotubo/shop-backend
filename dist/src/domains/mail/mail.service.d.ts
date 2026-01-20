import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { Queue } from 'bullmq';
import { ContactNotificationService } from '../notification/services/contact-notification.service';
export declare class MailService {
    private readonly db;
    private readonly emailQueue;
    private readonly contactNotificationService;
    constructor(db: db, emailQueue: Queue, contactNotificationService: ContactNotificationService);
    private normalizeEmail;
    listSubscribers(companyId: string, query: {
        storeId?: string;
        search?: string;
        status?: 'subscribed' | 'unsubscribed' | 'pending';
        page?: number;
        limit?: number;
    }): Promise<{
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
    getSubscriber(companyId: string, id: string): Promise<{
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
    updateSubscriberStatus(companyId: string, id: string, status: 'subscribed' | 'unsubscribed' | 'pending'): Promise<{
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
    listContactMessages(companyId: string, query: {
        storeId?: string;
        search?: string;
        status?: 'new' | 'read' | 'archived' | 'spam';
        page?: number;
        limit?: number;
    }): Promise<{
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
    getContactMessage(companyId: string, id: string): Promise<{
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
    updateContactMessageStatus(companyId: string, id: string, status: 'new' | 'read' | 'archived' | 'spam'): Promise<{
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
    createSubscriber(companyId: string, dto: {
        email: string;
        storeId?: string;
        source?: string;
    }, metadata?: any): Promise<{
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
    createContactMessage(companyId: string, dto: {
        storeId?: string;
        name?: string;
        email: string;
        phone?: string;
        company?: string;
        message: string;
        subject?: string;
    }, metadata?: any): Promise<{
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
}
