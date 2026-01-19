// src/modules/billing/invoices/schema/invoice-line-taxes.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { invoiceLines } from './invoice-lines.schema';
import { invoices } from './invoices.schema';
import { companies } from '../../companies/companies.schema';
import { taxes } from '../tax/taxes.schema';

export const invoiceLineTaxes = pgTable(
  'invoice_line_taxes',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),

    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),

    lineId: uuid('line_id')
      .notNull()
      .references(() => invoiceLines.id, { onDelete: 'cascade' }),

    taxId: uuid('tax_id').references(() => taxes.id, {
      onDelete: 'set null',
    }),

    // snapshot
    name: text('name').notNull(),
    rateBps: integer('rate_bps').notNull().default(0),
    inclusive: boolean('inclusive').notNull().default(false),

    // computed
    taxableBaseMinor: bigint('taxable_base_minor', { mode: 'number' })
      .notNull()
      .default(0),
    amountMinor: bigint('amount_minor', { mode: 'number' })
      .notNull()
      .default(0),
  },
  (t) => [
    index('invoice_line_taxes_invoice_idx').on(t.companyId, t.invoiceId),
    index('invoice_line_taxes_line_idx').on(t.companyId, t.lineId),
    index('invoice_line_taxes_tax_idx').on(t.companyId, t.taxId),
    uniqueIndex('invoice_line_taxes_line_tax_uq').on(
      t.companyId,
      t.lineId,
      t.taxId,
    ),
  ],
);
