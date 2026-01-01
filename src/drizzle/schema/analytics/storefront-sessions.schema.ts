// src/drizzle/schema/analytics/storefront-sessions.schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../companies/companies.schema';
import { stores } from '../stores/stores.schema';

export const storefrontSessions = pgTable(
  'storefront_sessions',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    sessionId: text('session_id').notNull(), // sf_sid from browser
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    lastPath: text('last_path'),
    referrer: text('referrer'),

    cartId: uuid('cart_id'),
    checkoutId: uuid('checkout_id'),
    orderId: uuid('order_id'),
    paymentId: uuid('payment_id'),

    ipHash: text('ip_hash'),
    uaHash: text('ua_hash'),

    meta: jsonb('meta'),
  },
  (t) => [
    uniqueIndex('storefront_sessions_company_session_uq').on(
      t.companyId,
      t.sessionId,
    ),
    index('storefront_sessions_company_last_seen_idx').on(
      t.companyId,
      t.lastSeenAt,
    ),
    index('storefront_sessions_company_store_idx').on(t.companyId, t.storeId),
  ],
);
