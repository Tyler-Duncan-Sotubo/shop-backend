import { Module } from '@nestjs/common';
import { EmailSenderConfigService } from './services/email-sender-config.service';
import { CampaignService } from './services/campaigns.service';
import { CampaignAudienceService } from './services/campaign-audience.service';
import { CampaignSendService } from './services/campaign-send.service';
import { CampaignWebhookService } from './services/campaign-webhook.service';
import { ResendProvider } from '../notification/resend.provider';

@Module({
  providers: [
    ResendProvider,
    EmailSenderConfigService,
    CampaignService,
    CampaignAudienceService,
    CampaignSendService,
    CampaignWebhookService,
  ],
  exports: [
    EmailSenderConfigService,
    CampaignService,
    CampaignAudienceService,
    CampaignSendService,
    CampaignWebhookService,
  ],
})
export class EmailMarketingModule {}
