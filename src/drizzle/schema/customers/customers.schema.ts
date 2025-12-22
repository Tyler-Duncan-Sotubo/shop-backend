import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
  uniqueIndex,
  text,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/drizzle/id';
import { customerTypeEnum } from '../enum.schema';

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    /**
     * Canonical name used for invoices & UI.
     * Example: "John Doe" or "Acme Ltd"
     */
    displayName: varchar('display_name', { length: 255 }).notNull(),

    type: customerTypeEnum('type').notNull().default('individual'),

    // Optional structured fields (handy for UI/search)
    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),
    companyName: varchar('company_name', { length: 255 }),

    /**
     * Primary billing contact info (NOT authentication)
     */
    billingEmail: varchar('billing_email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),

    /**
     * Tax identity (optional)
     */
    taxId: varchar('tax_id', { length: 100 }), // VAT/TIN/etc

    marketingOptIn: boolean('marketing_opt_in').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('customers_company_idx').on(t.companyId),
    index('customers_company_active_idx').on(t.companyId, t.isActive),
    index('customers_company_display_name_idx').on(t.companyId, t.displayName),

    /**
     * Optional uniqueness for billing email (only when present).
     * Enforce via SQL partial unique index:
     *
     * CREATE UNIQUE INDEX uq_customers_company_billing_email_not_null
     * ON customers(company_id, billing_email)
     * WHERE billing_email IS NOT NULL;
     */
    uniqueIndex('uq_customers_company_billing_email').on(
      t.companyId,
      t.billingEmail,
    ),
  ],
);
