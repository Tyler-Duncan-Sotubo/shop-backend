import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import { CampaignWebhookService } from "../../../domains/email-marketing/services/campaign-webhook.service";
export declare class CampaignWebhookController {
    private readonly webhookService;
    private readonly config;
    private readonly logger;
    constructor(webhookService: CampaignWebhookService, config: ConfigService);
    handle(req: FastifyRequest & {
        rawBody?: Buffer;
    }, svixId: string, svixTimestamp: string, svixSignature: string): Promise<{
        received: boolean;
    }>;
}
