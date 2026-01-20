import type { FastifyReply, FastifyRequest } from 'fastify';
import { TrackEventDto } from './dto/track-event.dto';
import { StoresService } from 'src/domains/commerce/stores/stores.service';
import { StorefrontAnalyticsService } from 'src/domains/analytics/services/storefront-analytics.service';
export declare class AnalyticsController {
    private readonly sf;
    private readonly domain;
    constructor(sf: StorefrontAnalyticsService, domain: StoresService);
    tagJs(reply: FastifyReply): Promise<never>;
    track(req: FastifyRequest, dto: TrackEventDto): Promise<{
        data: {
            ok: boolean;
            sessionId: string;
            stored: {
                id: string;
                companyId: string;
                storeId: string | null;
                cartId: string | null;
                checkoutId: string | null;
                meta: unknown;
                title: string | null;
                orderId: string | null;
                paymentId: string | null;
                sessionId: string;
                event: string;
                path: string | null;
                referrer: string | null;
                ts: Date;
            };
        };
    }>;
}
