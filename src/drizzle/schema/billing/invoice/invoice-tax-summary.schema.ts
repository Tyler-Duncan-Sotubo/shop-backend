// src/modules/billing/invoices/schema/invoice-tax-summary.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { invoices } from './invoices.schema';
import { companies } from '../../companies/companies.schema';

export const invoiceTaxSummary = pgTable(
  'invoice_tax_summary',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),

    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),

    taxName: text('tax_name').notNull(),
    rateBps: integer('rate_bps').notNull().default(0),

    taxableBaseMinor: bigint('taxable_base_minor', { mode: 'number' })
      .notNull()
      .default(0),

    taxMinor: bigint('tax_minor', { mode: 'number' }).notNull().default(0),
  },
  (t) => [
    index('invoice_tax_summary_invoice_idx').on(t.companyId, t.invoiceId),
    uniqueIndex('invoice_tax_summary_uq').on(
      t.companyId,
      t.invoiceId,
      t.taxName,
      t.rateBps,
    ),
  ],
);
