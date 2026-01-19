import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  bigint,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { payments } from './payments.schema';
import { invoices } from '../invoice/invoices.schema';
import { orders } from '../../commerce/orders/orders.schema';
import { paymentMethodEnum } from '../../enum.schema';

export const paymentReceipts = pgTable(
  'payment_receipts',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // 1:1 with payment
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),

    invoiceId: uuid('invoice_id').references(() => invoices.id, {
      onDelete: 'set null',
    }),
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),

    // ✅ denormalized printable numbers
    invoiceNumber: text('invoice_number'), // e.g. INV-000123
    orderNumber: text('order_number'), // e.g. ORD-000555 (your orderNumber)

    // sequential number per company
    sequenceNumber: integer('sequence_number').notNull(),
    receiptNumber: text('receipt_number').notNull(), // e.g. RCT-000045

    currency: text('currency').notNull(),
    amountMinor: bigint('amount_minor', { mode: 'number' }).notNull(),

    pdfUrl: text('pdf_url'),
    pdfStorageKey: text('pdf_storage_key'),

    method: paymentMethodEnum('method').notNull(),
    reference: text('reference'),

    customerSnapshot: jsonb('customer_snapshot'),
    storeSnapshot: jsonb('store_snapshot'),
    meta: jsonb('meta'),

    issuedAt: timestamp('issued_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    createdByUserId: uuid('created_by_user_id'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('payment_receipts_company_payment_uq').on(
      t.companyId,
      t.paymentId,
    ),
    uniqueIndex('payment_receipts_company_receipt_number_uq').on(
      t.companyId,
      t.receiptNumber,
    ),
    index('payment_receipts_company_invoice_idx').on(t.companyId, t.invoiceId),
    index('payment_receipts_company_order_idx').on(t.companyId, t.orderId),
  ],
);

// ✅ counter for receipt numbering
export const receiptCounters = pgTable(
  'receipt_counters',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    nextNumber: integer('next_number').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex('receipt_counters_company_uq').on(t.companyId)],
);
