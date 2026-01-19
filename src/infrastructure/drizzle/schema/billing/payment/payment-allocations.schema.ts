import { pgTable, uuid, timestamp, bigint, index } from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { allocationStatusEnum } from '../../enum.schema';
import { companies } from '../../companies/companies.schema';
import { invoices } from '../invoice/invoices.schema';
import { payments } from './payments.schema';
import { users } from '../../iam/users.schema';

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

    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('pay_alloc_company_payment_idx').on(t.companyId, t.paymentId),
    index('pay_alloc_company_invoice_idx').on(t.companyId, t.invoiceId),
  ],
);
