// src/domains/credits/schema/credit-balance.schema.ts
import { pgTable, uuid, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';

export const creditBalance = pgTable(
  'credit_balance',
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
      .unique()
      .references(() => companies.id, { onDelete: 'cascade' }),

    balance: integer('balance').notNull().default(0),
    lifetimeCredits: integer('lifetime_credits').notNull().default(0),
  },
  (t) => [index('credit_balance_company_idx').on(t.companyId)],
);

export type CreditBalance = typeof creditBalance.$inferSelect;
export type NewCreditBalance = typeof creditBalance.$inferInsert;
