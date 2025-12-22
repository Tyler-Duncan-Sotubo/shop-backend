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
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { carts } from './carts.schema';
import { products } from '../catalogs/products.schema';
import { productVariants } from '../catalogs/variants.schema';
import { isNull } from 'drizzle-orm';
import { defaultId } from 'src/drizzle/id';

export const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),

    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'restrict',
    }),

    // snapshot fields (stable display even if product changes)
    sku: varchar('sku', { length: 64 }),
    name: text('name').notNull(),

    quantity: integer('quantity').notNull().default(1),

    // snapshot pricing + computed line totals
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineSubtotal: numeric('line_subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    lineDiscountTotal: numeric('line_discount_total', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('0'),
    lineTaxTotal: numeric('line_tax_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),

    // flexible customization
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
    index('cart_items_company_idx').on(t.companyId),
    index('cart_items_cart_idx').on(t.cartId),
    index('cart_items_product_idx').on(t.productId),
    index('cart_items_variant_idx').on(t.variantId),

    // prevents duplicate variant rows per cart (adjust if you allow multiple rows per same variant)
    uniqueIndex('cart_items_cart_variant_uniq').on(t.cartId, t.variantId),
    uniqueIndex('cart_items_cart_product_no_variant_uniq')
      .on(t.cartId, t.productId)
      .where(isNull(t.variantId)),
  ],
);
