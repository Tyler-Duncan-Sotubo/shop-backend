import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';

export const companyBankAccounts = pgTable(
  'company_bank_accounts',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    label: text('label').notNull(), // "POS", "Bank Transfer", etc.
    bankName: text('bank_name').notNull(),
    accountName: text('account_name').notNull(),
    accountNumber: text('account_number').notNull(),
    tin: text('tin'),
    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('company_bank_accounts_company_idx').on(t.companyId),
  ],
);
