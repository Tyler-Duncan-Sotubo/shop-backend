import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CampaignService } from './campaigns.service';
export type ResendWebhookPayload = {
    type: 'email.sent' | 'email.delivered' | 'email.opened' | 'email.clicked' | 'email.bounced' | 'email.complained' | 'email.unsubscribed';
    data: {
        email_id: string;
        to: string[];
        click?: {
            link: string;
        };
    };
};
export declare class CampaignWebhookService {
    private readonly db;
    private readonly campaignService;
    private readonly logger;
    constructor(db: db, campaignService: CampaignService);
    handle(payload: ResendWebhookPayload): Promise<{
        received: boolean;
    }>;
}
