import { Module } from '@nestjs/common';
import { EmailSenderConfigController } from './email-sender-config.controller';
import { CampaignsModule } from 'src/domains/campaigns/campaigns.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignWebhookController } from './campaign-webhook.controller';

@Module({
  imports: [CampaignsModule],
  controllers: [
    CampaignsController,
    EmailSenderConfigController,
    CampaignWebhookController,
  ],
})
export class CampaignsAdminModule {}
