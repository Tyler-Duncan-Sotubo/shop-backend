import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { SubscriptionNotificationService } from "../../notification/services/subscription-notification.service";
export declare class SubscriptionCronService {
    private readonly db;
    private readonly subscriptions;
    private readonly notifications;
    private readonly logger;
    constructor(db: db, subscriptions: CompanySubscriptionsService, notifications: SubscriptionNotificationService);
    processExpiredSubscriptions(): Promise<void>;
    sendSubscriptionReminders(): Promise<void>;
    private getCompanyOwner;
}
