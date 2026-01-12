// src/drizzle/schema/analytics/storefront-events.schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../companies/companies.schema';
import { stores } from '../commerce/stores/stores.schema';

export const storefrontEvents = pgTable(
  'storefront_events',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    sessionId: text('session_id').notNull(),
    event: text('event').notNull(), // page_view, add_to_cart, begin_checkout...

    path: text('path'),
    referrer: text('referrer'),
    title: text('title'),

    cartId: uuid('cart_id'),
    checkoutId: uuid('checkout_id'),
    orderId: uuid('order_id'),
    paymentId: uuid('payment_id'),

    ts: timestamp('ts', { withTimezone: true }).defaultNow().notNull(),
    meta: jsonb('meta'),
  },
  (t) => [
    index('storefront_events_company_ts_idx').on(t.companyId, t.ts),
    index('storefront_events_company_event_idx').on(t.companyId, t.event),
    index('storefront_events_company_session_idx').on(t.companyId, t.sessionId),
  ],
);
