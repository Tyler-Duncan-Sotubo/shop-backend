// src/domains/subscriptions/schema/credit-topup-requests.schema.ts
import {
  pgTable,
  uuid,
  integer,
  text,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';
import { topupStatusEnum } from '../enum.schema';

export const creditTopupRequests = pgTable(
  'credit_topup_requests',
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

    // What they're buying
    credits: integer('credits').notNull(),
    amountNGN: integer('amount_ngn').notNull(),

    // Payment tracking
    status: topupStatusEnum('status').notNull().default('pending'),
    paystackReference: text('paystack_reference').notNull().unique(),
    paystackAccessCode: text('paystack_access_code'),

    // Timestamps
    paidAt: timestamp('paid_at', { withTimezone: true }),

    // Extra metadata — bundle label, initiated by userId, etc
    metadata: jsonb('metadata'),
  },
  (t) => [
    index('credit_topup_company_idx').on(t.companyId),
    index('credit_topup_status_idx').on(t.status),
    index('credit_topup_reference_idx').on(t.paystackReference),
  ],
);

export type CreditTopupRequest = typeof creditTopupRequests.$inferSelect;
export type NewCreditTopupRequest = typeof creditTopupRequests.$inferInsert;
