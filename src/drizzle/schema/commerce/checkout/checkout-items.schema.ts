import {
  pgTable,
  uuid,
  integer,
  numeric,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { checkouts } from './checkouts.schema';
import { products } from '../../catalogs/products.schema';
import { productVariants } from '../../catalogs/variants.schema';
import { defaultId } from 'src/drizzle/id';

export const checkoutItems = pgTable(
  'checkout_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    checkoutId: uuid('checkout_id')
      .notNull()
      .references(() => checkouts.id, { onDelete: 'cascade' }),

    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),

    sku: varchar('sku', { length: 64 }),
    name: text('name').notNull(),
    quantity: integer('quantity').notNull(),

    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),

    attributes: jsonb('attributes').$type<Record<string, any>>(),
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('checkout_items_company_checkout_idx').on(t.companyId, t.checkoutId),
  ],
);
