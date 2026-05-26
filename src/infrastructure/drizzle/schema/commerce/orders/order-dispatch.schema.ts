import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
  text,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { stores } from '../stores/stores.schema';
import { orders } from './orders.schema';

export const orderDispatches = pgTable(
  'order_dispatches',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    status: varchar('status', { length: 32 })
      .notNull()
      .default('pending')
      .$type<'pending' | 'dispatched' | 'cancelled'>(),

    requestedByUserId: uuid('requested_by_user_id'),
    confirmedByUserId: uuid('confirmed_by_user_id'),

    note: text('note'),

    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('order_dispatches_company_idx').on(t.companyId),
    index('order_dispatches_order_idx').on(t.companyId, t.orderId),
    index('order_dispatches_status_idx').on(t.companyId, t.status),
    index('order_dispatches_store_status_idx').on(
      t.companyId,
      t.storeId,
      t.status,
    ),
  ],
);
