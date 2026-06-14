import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from '../../id';
import { companies } from '../companies/companies.schema';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    type: varchar('type', { length: 50 }).notNull(),
    // new_order | dispatch_requested | payment_received | low_stock | order_cancelled
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    // any related entity ids { orderId, productId, variantId, etc }
    data: jsonb('data'),
    channel: varchar('channel', { length: 20 }).notNull().default('in_app'),
    // in_app | push | both
  },
  (t) => [
    index('notifications_company_idx').on(t.companyId),
    index('notifications_user_idx').on(t.userId),
    index('notifications_company_unread_idx').on(t.companyId, t.readAt),
    index('notifications_user_unread_idx').on(t.userId, t.readAt),
    index('notifications_company_created_idx').on(t.companyId, t.createdAt),
    index('notifications_type_idx').on(t.companyId, t.type),
  ],
);
