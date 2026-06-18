// src/domains/campaigns/schema/campaign-events.schema.ts
import {
  pgTable,
  uuid,
  timestamp,
  index,
  pgEnum,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { campaigns } from './campaigns.schema';
import { companies } from '../companies/companies.schema';
import { campaignEventTypeEnum } from '../enum.schema';

export const campaignEvents = pgTable(
  'campaign_events',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),

    // Who received it — nullable because subscriber may not be a customer
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),

    // Resend message id — lets you correlate webhook events
    resendMessageId: varchar('resend_message_id', { length: 255 }),

    eventType: campaignEventTypeEnum('event_type').notNull(),

    // For click events
    clickedUrl: text('clicked_url'),
  },
  (t) => [
    index('campaign_events_campaign_idx').on(t.campaignId),
    index('campaign_events_company_idx').on(t.companyId),
    index('campaign_events_email_idx').on(t.recipientEmail),
    index('campaign_events_resend_msg_idx').on(t.resendMessageId),
    index('campaign_events_type_idx').on(t.eventType),
  ],
);

export type CampaignEvent = typeof campaignEvents.$inferSelect;
export type NewCampaignEvent = typeof campaignEvents.$inferInsert;
