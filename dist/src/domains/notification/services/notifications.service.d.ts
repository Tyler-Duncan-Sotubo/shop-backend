import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
export type NotificationType = 'new_order' | 'dispatch_requested' | 'payment_received' | 'order_cancelled' | 'low_stock' | 'order_fulfilled' | 'new_quote';
export type NotificationChannel = 'in_app' | 'push' | 'both';
export interface CreateNotificationInput {
    companyId: string;
    userId?: string | null;
    type: NotificationType;
    title: string;
    body?: string | null;
    data?: Record<string, any> | null;
    channel?: NotificationChannel;
}
export declare class NotificationsService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    create(input: CreateNotificationInput): Promise<{
        id: string;
        data: unknown;
        createdAt: Date;
        companyId: string;
        type: string;
        channel: string;
        title: string;
        userId: string | null;
        readAt: Date | null;
        body: string | null;
    }>;
    list(params: {
        companyId: string;
        userId: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        readAt: Date | null;
        companyId: string;
        userId: string | null;
        type: string;
        title: string;
        body: string | null;
        data: unknown;
        channel: string;
    }[]>;
    unreadCount(params: {
        companyId: string;
        userId: string;
    }): Promise<{
        count: number;
    }>;
    markAsRead(params: {
        notificationId: string;
        companyId: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        readAt: Date | null;
        companyId: string;
        userId: string | null;
        type: string;
        title: string;
        body: string | null;
        data: unknown;
        channel: string;
    }>;
    markAllAsRead(params: {
        companyId: string;
        userId: string;
    }): Promise<{
        success: boolean;
    }>;
    deleteOlderThan(days: number): Promise<void>;
}
