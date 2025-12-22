// src/drizzle/schema/customers/customer-credentials.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../companies/companies.schema';
import { customers } from './customers.schema';

export const customerCredentials = pgTable(
  'customer_credentials',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),

    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    isVerified: boolean('is_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    inviteTokenHash: varchar('invite_token_hash', { length: 255 }),
    inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
    inviteAcceptedAt: timestamp('invite_accepted_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('customer_credentials_company_idx').on(t.companyId),
    index('customer_credentials_customer_idx').on(t.customerId),

    // login email uniqueness within company
    uniqueIndex('customer_credentials_company_email_uq').on(
      t.companyId,
      t.email,
    ),
    uniqueIndex('customer_credentials_customer_uq').on(t.customerId),
  ],
);
