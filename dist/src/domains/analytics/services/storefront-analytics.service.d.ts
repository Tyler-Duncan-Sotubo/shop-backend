import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { TrackEventInput } from '../inputs/track-event.input';
export declare class StorefrontAnalyticsService {
    private readonly db;
    constructor(db: DbType);
    private static readonly SESSION_TTL_MS;
    trackEvent(args: {
        companyId: string;
        storeId: string | null;
        inputs: TrackEventInput;
    }): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        title: string | null;
        cartId: string | null;
        checkoutId: string | null;
        meta: unknown;
        orderId: string | null;
        paymentId: string | null;
        sessionId: string;
        event: string;
        path: string | null;
        referrer: string | null;
        ts: Date;
    }>;
}
