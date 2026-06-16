import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CampaignService } from './campaigns.service';
import { CampaignAudienceService } from './campaign-audience.service';
import { EmailSenderConfigService } from './email-sender-config.service';
import { CreditService } from "../../credits/credits.service";
import { ResendProvider } from "../../notification/resend.provider";
export declare class CampaignSendService {
    private readonly db;
    private readonly resend;
    private readonly campaignService;
    private readonly audience;
    private readonly emailConfig;
    private readonly credits;
    private readonly logger;
    constructor(db: db, resend: ResendProvider, campaignService: CampaignService, audience: CampaignAudienceService, emailConfig: EmailSenderConfigService, credits: CreditService);
    sendTest(companyId: string, campaignId: string, toEmail: string): Promise<{
        success: boolean;
        sentTo: string;
    }>;
    sendNow(companyId: string, campaignId: string): Promise<{
        success: boolean;
        sentCount: number;
    }>;
    processDueScheduled(): Promise<void>;
}
