// src/drizzle/schema/customers/customer-contacts.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';
import { customers } from './customers.schema';

/**
 * Billing/communication contacts for a customer (Zoho-style).
 * Separate from auth. You can have many contacts per customer.
 */
export const customerContacts = pgTable(
  'customer_contacts',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),

    isPrimary: boolean('is_primary').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('customer_contacts_company_idx').on(t.companyId),
    index('customer_contacts_customer_idx').on(t.customerId),
    uniqueIndex('customer_contacts_customer_primary_soft_uq').on(
      t.customerId,
      t.isPrimary,
    ),
  ],
);
