// src/domains/orders/schema/order-custom-items.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  varchar,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { orders } from './orders.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { stores } from '../stores/stores.schema';

export const orderCustomItems = pgTable(
  'order_custom_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }), // ← add

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    note: text('note'),

    quantity: integer('quantity').notNull().default(1),

    unitPrice: numeric('unit_price', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    unitPriceMinor: integer('unit_price_minor').notNull().default(0),

    lineTotal: numeric('line_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    lineTotalMinor: integer('line_total_minor').notNull().default(0),

    currency: varchar('currency', { length: 3 }).notNull().default('NGN'),
  },
  (t) => [
    index('order_custom_items_order_idx').on(t.orderId),
    index('order_custom_items_company_idx').on(t.companyId),
  ],
);

export type OrderCustomItem = typeof orderCustomItems.$inferSelect;
export type NewOrderCustomItem = typeof orderCustomItems.$inferInsert;
