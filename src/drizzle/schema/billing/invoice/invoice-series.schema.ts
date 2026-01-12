// src/modules/billing/invoices/schema/invoice-series.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { stores } from '../../commerce/stores/stores.schema';
import { invoiceTypeEnum } from '../../enum.schema';

export const invoiceSeries = pgTable(
  'invoice_series',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    type: invoiceTypeEnum('type').notNull().default('invoice'),

    name: text('name').notNull(), // "Default", "POS", "Online"
    prefix: text('prefix').notNull(), // "INV-", "CN-"
    suffix: text('suffix'), // optional
    padding: integer('padding').notNull().default(6),

    nextNumber: integer('next_number').notNull().default(1),
    year: integer('year'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('invoice_series_company_idx').on(t.companyId),
    uniqueIndex('invoice_series_company_name_uq').on(
      t.companyId,
      t.name,
      t.storeId,
      t.year,
    ),
    uniqueIndex('invoice_series_company_prefix_uq').on(
      t.companyId,
      t.prefix,
      t.storeId,
      t.year,
    ),
  ],
);
