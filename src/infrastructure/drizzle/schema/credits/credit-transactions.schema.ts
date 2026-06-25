import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';
import { creditChannelEnum, creditTransactionTypeEnum } from '../enum.schema';

export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    channel: creditChannelEnum('channel').notNull(), // email | sms

    type: creditTransactionTypeEnum('type').notNull(),

    amount: integer('amount').notNull(), // positive = credit, negative = debit

    balanceAfter: integer('balance_after').notNull(),

    // What triggered this — generic so it works for email campaigns, sms blasts, etc
    referenceType: varchar('reference_type', { length: 50 }), // 'campaign' | 'sms_blast'
    referenceId: uuid('reference_id'), // the campaign or blast id

    note: text('note'), // admin notes for topups / adjustments
  },
  (t) => [
    index('credit_tx_company_idx').on(t.companyId),
    index('credit_tx_channel_idx').on(t.channel),
    index('credit_tx_type_idx').on(t.type),
    index('credit_tx_reference_idx').on(t.referenceType, t.referenceId),
  ],
);

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;
