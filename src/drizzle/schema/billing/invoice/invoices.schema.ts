// src/modules/billing/invoices/schema/invoices.schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  bigint,
  integer,
  numeric,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { invoiceStatusEnum, invoiceTypeEnum } from '../../enum.schema';
import { orders } from '../../orders/orders.schema';
import { stores } from '../../stores/stores.schema';
import { companies } from '../../companies/companies.schema';
import { customers } from '../../customers/customers.schema';
import { customerAddresses } from '../../customers/customer-addresses.schema';
import { invoiceSeries } from './invoice-series.schema';
import { quoteRequests } from '../../quotes/quote-requests.schema';

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),

    quoteRequestId: uuid('quote_request_id').references(
      () => quoteRequests.id,
      {
        onDelete: 'set null',
      },
    ),

    type: invoiceTypeEnum('type').notNull().default('invoice'),
    status: invoiceStatusEnum('status').notNull().default('draft'),

    // -----------------------------
    // Customer (draft-time links)
    // -----------------------------
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),

    billingAddressId: uuid('billing_address_id').references(
      () => customerAddresses.id,
      { onDelete: 'set null' },
    ),
    shippingAddressId: uuid('shipping_address_id').references(
      () => customerAddresses.id,
      { onDelete: 'set null' },
    ),

    // Snapshot at issuance (immutable source of truth for PDFs)
    customerSnapshot: jsonb('customer_snapshot'),
    supplierSnapshot: jsonb('supplier_snapshot'),

    // -----------------------------
    // Numbering (null until issued)
    // -----------------------------
    seriesId: uuid('series_id').references(() => invoiceSeries.id, {
      onDelete: 'set null',
    }),

    sequenceNumber: integer('sequence_number'), // allocated integer
    number: text('number'), // formatted e.g. "INV-000123"

    issuedAt: timestamp('issued_at', { withTimezone: true }),
    dueAt: timestamp('due_at', { withTimezone: true }),

    // -----------------------------
    // Currency
    // -----------------------------
    currency: text('currency').notNull(), // "NGN", "GBP", etc.

    // Optional: if your company has a base currency and you invoice in foreign currency
    exchangeRate: numeric('exchange_rate', { precision: 18, scale: 8 }),

    // -----------------------------
    // Totals (minor units)
    // -----------------------------
    subtotalMinor: bigint('subtotal_minor', { mode: 'number' })
      .notNull()
      .default(0),

    discountMinor: bigint('discount_minor', { mode: 'number' })
      .notNull()
      .default(0),

    shippingMinor: bigint('shipping_minor', { mode: 'number' })
      .notNull()
      .default(0),

    taxMinor: bigint('tax_minor', { mode: 'number' }).notNull().default(0),

    adjustmentMinor: bigint('adjustment_minor', { mode: 'number' })
      .notNull()
      .default(0),

    roundingMinor: bigint('rounding_minor', { mode: 'number' })
      .notNull()
      .default(0),

    totalMinor: bigint('total_minor', { mode: 'number' }).notNull().default(0),

    paidMinor: bigint('paid_minor', { mode: 'number' }).notNull().default(0),

    balanceMinor: bigint('balance_minor', { mode: 'number' })
      .notNull()
      .default(0),

    // -----------------------------
    // Control / audit
    // -----------------------------
    lockedAt: timestamp('locked_at', { withTimezone: true }), // set when issued
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),

    // extra metadata: notes, terms, tax breakdown, etc.
    meta: jsonb('meta'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('invoices_company_status_idx').on(t.companyId, t.status),
    index('invoices_company_customer_idx').on(t.companyId, t.customerId),
    index('invoices_company_order_idx').on(t.companyId, t.orderId),
    index('invoices_company_issued_idx').on(t.companyId, t.issuedAt),

    // enforce uniqueness of invoice number per company once present
    uniqueIndex('invoices_company_number_uq').on(t.companyId, t.number),
    uniqueIndex('invoices_company_order_type_uq').on(
      t.companyId,
      t.orderId,
      t.type,
    ),

    // useful when you allocate sequences
    index('invoices_company_series_seq_idx').on(
      t.companyId,
      t.seriesId,
      t.sequenceNumber,
    ),
  ],
);
