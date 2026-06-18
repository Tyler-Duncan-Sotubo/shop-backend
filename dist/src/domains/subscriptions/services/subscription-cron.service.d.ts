import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CompanySubscriptionsService } from './company-subscriptions.service';
export declare class SubscriptionCronService {
    private readonly db;
    private readonly subscriptions;
    private readonly logger;
    constructor(db: db, subscriptions: CompanySubscriptionsService);
    processExpiredSubscriptions(): Promise<void>;
}
