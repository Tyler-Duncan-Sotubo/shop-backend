// src/drizzle/schema/analytics/analytics-tags.schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../companies/companies.schema';
import { stores } from '../commerce/stores/stores.schema';

export const analyticsTags = pgTable(
  'analytics_tags',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    name: text('name').notNull(), // "Main Storefront", "POS Kiosk", etc.

    // secret token used by the script + track endpoint
    token: text('token').notNull(),

    isActive: boolean('is_active').notNull().default(true),

    createdByUserId: uuid('created_by_user_id'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    meta: jsonb('meta'),
  },
  (t) => [
    uniqueIndex('analytics_tags_company_token_uq').on(t.companyId, t.token),
    index('analytics_tags_company_store_idx').on(t.companyId, t.storeId),
    index('analytics_tags_company_active_idx').on(t.companyId, t.isActive),
  ],
);
