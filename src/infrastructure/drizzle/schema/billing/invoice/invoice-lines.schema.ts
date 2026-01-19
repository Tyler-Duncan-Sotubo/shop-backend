// src/modules/billing/invoices/schema/invoice-lines.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  bigint,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { productVariants } from '../../catalogs/variants.schema';
import { products } from '../../catalogs/products.schema';
import { companies } from '../../companies/companies.schema';
import { invoices } from './invoices.schema';
import { orders } from '../../commerce/orders/orders.schema';
import { taxes } from '../tax/taxes.schema';

export const invoiceLines = pgTable(
  'invoice_lines',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),

    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),

    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),

    position: integer('position').notNull().default(0),

    description: text('description').notNull(),
    quantity: integer('quantity').notNull().default(1),

    unitPriceMinor: bigint('unit_price_minor', { mode: 'number' })
      .notNull()
      .default(0),

    // Discounts (Zoho-like)
    discountMinor: bigint('discount_minor', { mode: 'number' })
      .notNull()
      .default(0),

    // Derived totals (store results so issued invoices are stable)
    lineNetMinor: bigint('line_net_minor', { mode: 'number' })
      .notNull()
      .default(0),

    /**
     * Back-compat: single tax selection.
     * If you move fully to multi-tax, keep this nullable or drop later.
     */
    taxId: uuid('tax_id').references(() => taxes.id, {
      onDelete: 'set null',
    }),

    // Snapshot tax facts (still valuable even with multi-tax)
    taxName: text('tax_name'),
    taxRateBps: integer('tax_rate_bps').notNull().default(0),
    taxInclusive: boolean('tax_inclusive').notNull().default(false),

    taxExempt: boolean('tax_exempt').notNull().default(false),
    taxExemptReason: text('tax_exempt_reason'),

    taxMinor: bigint('tax_minor', { mode: 'number' }).notNull().default(0),

    lineTotalMinor: bigint('line_total_minor', { mode: 'number' })
      .notNull()
      .default(0),

    meta: jsonb('meta'),
  },
  (t) => [
    index('invoice_lines_company_invoice_idx').on(t.companyId, t.invoiceId),
    index('invoice_lines_company_tax_idx').on(t.companyId, t.taxId),
    index('invoice_lines_company_order_idx').on(t.companyId, t.orderId),

    // ordering correctness
    uniqueIndex('invoice_lines_company_invoice_position_uq').on(
      t.companyId,
      t.invoiceId,
      t.position,
    ),
  ],
);
