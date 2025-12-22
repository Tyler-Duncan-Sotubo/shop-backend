// src/drizzle/schema/customers/customer-addresses.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { customers } from './customers.schema';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/drizzle/id';

export const customerAddresses = pgTable(
  'customer_addresses',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),

    label: varchar('label', { length: 100 }), // "Home", "Office", etc.

    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),

    line1: varchar('line1', { length: 255 }).notNull(),
    line2: varchar('line2', { length: 255 }),
    city: varchar('city', { length: 100 }).notNull(),
    state: varchar('state', { length: 100 }),
    postalCode: varchar('postal_code', { length: 50 }),
    country: varchar('country', { length: 100 }).notNull(),
    phone: varchar('phone', { length: 50 }),

    isDefaultBilling: boolean('is_default_billing').notNull().default(false),
    isDefaultShipping: boolean('is_default_shipping').notNull().default(false),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_customer_addresses_company_id').on(table.companyId),
    index('idx_customer_addresses_customer_id').on(table.customerId),
  ],
);
