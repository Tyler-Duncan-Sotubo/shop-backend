import { BaseController } from "../../../infrastructure/interceptor/base.controller";
import { User } from "../common/types/user.type";
import { NotificationsService } from "../../../domains/notification/services/notifications.service";
export declare class NotificationsController extends BaseController {
    private readonly notifications;
    constructor(notifications: NotificationsService);
    list(user: User, limit?: string, offset?: string): Promise<{
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
    unreadCount(user: User): Promise<{
        count: number;
    }>;
    markAsRead(user: User, id: string): Promise<{
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
    markAllAsRead(user: User): Promise<{
        success: boolean;
    }>;
}
