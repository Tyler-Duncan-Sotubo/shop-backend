import { db as DbType } from 'src/drizzle/types/drizzle';
export declare class StorefrontAnalyticsService {
    private readonly db;
    constructor(db: DbType);
    private static readonly SESSION_TTL_MS;
    trackEvent(args: {
        tag: any;
        dto: any;
    }): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        referrer: string | null;
        title: string | null;
        meta: unknown;
        cartId: string | null;
        checkoutId: string | null;
        orderId: string | null;
        paymentId: string | null;
        sessionId: string;
        event: string;
        path: string | null;
        ts: Date;
    }>;
}
