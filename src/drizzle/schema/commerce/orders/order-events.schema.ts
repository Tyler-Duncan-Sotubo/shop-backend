import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';

export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    companyId: uuid('company_id').notNull(),
    orderId: uuid('order_id').notNull(),

    type: text('type').notNull(), // or pgEnum
    fromStatus: text('from_status'),
    toStatus: text('to_status'),

    actorUserId: uuid('actor_user_id'),
    ipAddress: text('ip_address'),
    message: text('message'),

    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('order_events_company_order_idx').on(t.companyId, t.orderId),
    index('order_events_company_created_idx').on(t.companyId, t.createdAt),
  ],
);
