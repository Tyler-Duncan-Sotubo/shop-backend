import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  bigint,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { paymentMethodEnum, paymentStatusEnum } from '../../enum.schema';
import { companies } from '../../companies/companies.schema';
import { orders } from '../../orders/orders.schema';
import { invoices } from '../invoice/invoices.schema';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // where this payment is intended to go (optional pointers)
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),
    invoiceId: uuid('invoice_id').references(() => invoices.id, {
      onDelete: 'set null',
    }),

    method: paymentMethodEnum('method').notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),

    currency: text('currency').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),

    reference: text('reference'), // bank narration / POS slip / internal ref

    provider: text('provider'), // "paystack"
    providerRef: text('provider_ref'), // ✅ NEW: gateway transaction reference (idempotency)
    providerEventId: text('provider_event_id'), // webhook event id (secondary idempotency)

    receivedAt: timestamp('received_at', { withTimezone: true }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),

    createdByUserId: uuid('created_by_user_id'),
    confirmedByUserId: uuid('confirmed_by_user_id'),

    meta: jsonb('meta'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('payments_company_invoice_idx').on(t.companyId, t.invoiceId),
    index('payments_company_order_idx').on(t.companyId, t.orderId),
    index('payments_company_reference_idx').on(t.companyId, t.reference),

    index('payments_company_provider_event_idx').on(
      t.companyId,
      t.provider,
      t.providerEventId,
    ),

    // ✅ idempotency: gateway reference must be unique per company+provider
    uniqueIndex('payments_company_provider_ref_uq').on(
      t.companyId,
      t.provider,
      t.providerRef,
    ),

    // ✅ optional: webhook event id uniqueness too (if you use it)
    uniqueIndex('payments_company_provider_event_uq').on(
      t.companyId,
      t.provider,
      t.providerEventId,
    ),
  ],
);
