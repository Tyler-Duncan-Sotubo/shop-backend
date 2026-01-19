import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  bigint,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { orders } from './orders.schema';
import { companies } from '../../companies/companies.schema';

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),

    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),

    productId: uuid('product_id'),
    variantId: uuid('variant_id'),

    sku: varchar('sku', { length: 64 }),
    name: text('name').notNull(),

    quantity: integer('quantity').notNull(),

    // Existing (major)
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),

    // ✅ NEW (minor)
    unitPriceMinor: bigint('unit_price_minor', { mode: 'number' })
      .notNull()
      .default(0),
    lineTotalMinor: bigint('line_total_minor', { mode: 'number' })
      .notNull()
      .default(0),

    attributes: jsonb('attributes'),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('order_items_company_order_idx').on(t.companyId, t.orderId),
    index('order_items_company_product_idx').on(t.companyId, t.productId),
    index('order_items_company_variant_idx').on(t.companyId, t.variantId),
  ],
);
