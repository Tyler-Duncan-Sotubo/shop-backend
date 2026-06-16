// src/domains/email-marketing/schema/campaigns.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';
import { stores } from '../commerce/stores/stores.schema';
import {
  campaignAudienceTypeEnum,
  campaignStatusEnum,
  campaignTemplateTypeEnum,
} from '../enum.schema';

export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    templateType: campaignTemplateTypeEnum('template_type').notNull(),
    status: campaignStatusEnum('status').notNull().default('draft'),
    audienceType: campaignAudienceTypeEnum('audience_type')
      .notNull()
      .default('all'),

    // Email content
    subject: text('subject').notNull(),
    previewText: text('preview_text'),

    // Template fields (stored as JSON blob — flexible per template)
    contentJson: text('content_json'), // JSON string of template-specific fields

    // Sending
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentCount: integer('sent_count').notNull().default(0),

    // Stats (denormalised for fast reads — also derivable from campaign_events)
    openCount: integer('open_count').notNull().default(0),
    clickCount: integer('click_count').notNull().default(0),
    unsubscribeCount: integer('unsubscribe_count').notNull().default(0),

    // Resend batch id — lets you look up the send in Resend dashboard
    resendBatchId: varchar('resend_batch_id', { length: 255 }),
  },
  (t) => [
    index('campaigns_company_idx').on(t.companyId),
    index('campaigns_store_idx').on(t.storeId),
    index('campaigns_status_idx').on(t.status),
    index('campaigns_scheduled_at_idx').on(t.scheduledAt),
  ],
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
