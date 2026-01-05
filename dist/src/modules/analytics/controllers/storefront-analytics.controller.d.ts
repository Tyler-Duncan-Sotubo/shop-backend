import { AnalyticsTagService } from '../services/analytics-tag.service';
import { TrackEventDto } from '../dto/track-event.dto';
import { StorefrontAnalyticsService } from '../services/storefront-analytics.service';
import type { FastifyReply } from 'fastify';
export declare class StorefrontAnalyticsController {
    private readonly tags;
    private readonly sf;
    constructor(tags: AnalyticsTagService, sf: StorefrontAnalyticsService);
    tagJs(token: string, reply: FastifyReply): Promise<never>;
    track(token: string, dto: TrackEventDto): Promise<{
        data: {
            ok: boolean;
            sessionId: string;
            stored: {
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
            };
        };
    }>;
}
