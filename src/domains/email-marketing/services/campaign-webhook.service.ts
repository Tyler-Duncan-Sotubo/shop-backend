// src/domains/email-marketing/services/campaign-webhook.service.ts
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { campaignEvents, subscribers } from 'src/infrastructure/drizzle/schema';
import { CampaignService } from './campaigns.service';

export type ResendWebhookPayload = {
  type:
    | 'email.sent'
    | 'email.delivered'
    | 'email.opened'
    | 'email.clicked'
    | 'email.bounced'
    | 'email.complained'
    | 'email.unsubscribed';
  data: {
    email_id: string; // resendMessageId
    to: string[];
    click?: { link: string };
  };
};

@Injectable()
export class CampaignWebhookService {
  private readonly logger = new Logger(CampaignWebhookService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly campaignService: CampaignService,
  ) {}

  async handle(payload: ResendWebhookPayload) {
    const { type, data } = payload;
    const resendMessageId = data.email_id;
    const recipientEmail = data.to?.[0];

    if (!resendMessageId || !recipientEmail) {
      this.logger.warn('Webhook received with missing email_id or recipient');
      return { received: true };
    }

    // ── Find the campaign event row by resendMessageId ──────
    const [sentEvent] = await this.db
      .select()
      .from(campaignEvents)
      .where(eq(campaignEvents.resendMessageId, resendMessageId))
      .limit(1)
      .execute();

    if (!sentEvent) {
      // Could be a transactional email — not a campaign. Ignore silently.
      this.logger.debug(
        `No campaign event found for resendMessageId: ${resendMessageId}`,
      );
      return { received: true };
    }

    const { campaignId, companyId } = sentEvent;

    switch (type) {
      case 'email.opened': {
        await this.db
          .insert(campaignEvents)
          .values({
            companyId,
            campaignId,
            recipientEmail,
            resendMessageId,
            eventType: 'opened',
          })
          .execute();

        await this.campaignService.incrementStat(campaignId, 'openCount');
        break;
      }

      case 'email.clicked': {
        await this.db
          .insert(campaignEvents)
          .values({
            companyId,
            campaignId,
            recipientEmail,
            resendMessageId,
            eventType: 'clicked',
            clickedUrl: data.click?.link ?? null,
          })
          .execute();

        await this.campaignService.incrementStat(campaignId, 'clickCount');
        break;
      }

      case 'email.unsubscribed': {
        await this.db
          .insert(campaignEvents)
          .values({
            companyId,
            campaignId,
            recipientEmail,
            resendMessageId,
            eventType: 'unsubscribed',
          })
          .execute();

        await this.campaignService.incrementStat(
          campaignId,
          'unsubscribeCount',
        );

        // ── Mark subscriber as unsubscribed ────────────────
        await this.db
          .update(subscribers)
          .set({ status: 'unsubscribed', updatedAt: new Date() })
          .where(eq(subscribers.email, recipientEmail))
          .execute();

        break;
      }

      case 'email.bounced': {
        await this.db
          .insert(campaignEvents)
          .values({
            companyId,
            campaignId,
            recipientEmail,
            resendMessageId,
            eventType: 'bounced',
          })
          .execute();

        break;
      }

      case 'email.complained': {
        await this.db
          .insert(campaignEvents)
          .values({
            companyId,
            campaignId,
            recipientEmail,
            resendMessageId,
            eventType: 'complained',
          })
          .execute();

        // Treat spam complaint as unsubscribe
        await this.db
          .update(subscribers)
          .set({ status: 'unsubscribed', updatedAt: new Date() })
          .where(eq(subscribers.email, recipientEmail))
          .execute();

        break;
      }

      default:
        // email.sent / email.delivered — no action needed
        this.logger.debug(`Webhook event ignored: ${type}`);
    }

    return { received: true };
  }
}
