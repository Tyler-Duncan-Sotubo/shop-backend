import { Module } from '@nestjs/common';
import { EmailSenderConfigController } from './email-sender-config.controller';
import { EmailMarketingModule } from 'src/domains/email-marketing/email-marketing.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignWebhookController } from './campaign-webhook.controller';

@Module({
  imports: [EmailMarketingModule],
  controllers: [
    CampaignsController,
    EmailSenderConfigController,
    CampaignWebhookController,
  ],
})
export class EmailMarketingAdminModule {}
