import {
  pgTable,
  uuid,
  timestamp,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { allocationStatusEnum } from '../../enum.schema';
import { companies } from '../../companies/companies.schema';
import { invoices } from '../invoice/invoices.schema';
import { payments } from './payments.schema';

export const paymentAllocations = pgTable(
  'payment_allocations',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),

    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),

    status: allocationStatusEnum('status').notNull().default('applied'),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('pay_alloc_company_payment_idx').on(t.companyId, t.paymentId),
    index('pay_alloc_company_invoice_idx').on(t.companyId, t.invoiceId),

    // ✅ stronger tenant-safe idempotency
    uniqueIndex('pay_alloc_company_payment_invoice_uq').on(
      t.companyId,
      t.paymentId,
      t.invoiceId,
    ),
  ],
);
