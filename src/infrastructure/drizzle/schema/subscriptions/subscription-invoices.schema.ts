// src/domains/subscriptions/schema/subscription-invoices.schema.ts
import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companySubscriptions } from './company-subscriptions.schema';
import { creditTopupRequests } from './credit-topup-requests.schema';
import { companies } from '../companies/companies.schema';
import {
  subscriptionInvoiceStatusEnum,
  subscriptionInvoiceTypeEnum,
} from '../enum.schema';

export const subscriptionInvoices = pgTable(
  'subscription_invoices',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // One of these will be set depending on type
    subscriptionId: uuid('subscription_id').references(
      () => companySubscriptions.id,
      { onDelete: 'set null' },
    ),
    topupRequestId: uuid('topup_request_id').references(
      () => creditTopupRequests.id,
      { onDelete: 'set null' },
    ),

    type: subscriptionInvoiceTypeEnum('type').notNull(),
    status: subscriptionInvoiceStatusEnum('status').notNull(),

    amountNGN: integer('amount_ngn').notNull(),
    paystackReference: text('paystack_reference'),

    paidAt: timestamp('paid_at', { withTimezone: true }),
  },
  (t) => [
    index('subscription_invoices_company_idx').on(t.companyId),
    index('subscription_invoices_type_idx').on(t.type),
    index('subscription_invoices_status_idx').on(t.status),
    index('subscription_invoices_sub_idx').on(t.subscriptionId),
    index('subscription_invoices_topup_idx').on(t.topupRequestId),
  ],
);

export type SubscriptionInvoice = typeof subscriptionInvoices.$inferSelect;
export type NewSubscriptionInvoice = typeof subscriptionInvoices.$inferInsert;
