import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    // Company identity
    name: text('name').notNull(), // Public-facing business/store name
    slug: text('slug').notNull(), // Unique company slug

    // Legal / compliance info
    legalName: text('legal_name'), // Registered legal name
    country: text('country'), // HQ country (ISO code)
    vatNumber: text('vat_number'), // VAT/TIN/etc.

    // Default configuration (non-overlapping with general settings)
    defaultCurrency: text('default_currency').notNull().default('NGN'),

    timezone: text('timezone').notNull().default('UTC'),

    defaultLocale: text('default_locale').notNull().default('en-NG'),

    // Billing & subscription info
    billingEmail: text('billing_email'), // For invoices, receipts
    billingCustomerId: text('billing_customer_id'),
    billingProvider: text('billing_provider'),

    plan: text('plan').notNull().default('free'),

    // New fields
    companySize: text('company_size'), // e.g. 'solo' | '2-10' | '11-50' | '51-200' | '200+'
    industry: text('industry'), // e.g. 'fashion', 'food', 'electronics', 'services'
    useCase: text('use_case'), // e.g. 'online-store', 'catalog', 'booking', 'subscriptions'

    trialEndsAt: timestamp('trial_ends_at', { mode: 'date' }),

    isActive: boolean('is_active').notNull().default(true),

    // Meta
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),

    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    uniqueIndex('companies_slug_unique').on(table.slug),
    index('idx_companies_country').on(table.country),
    index('idx_companies_plan').on(table.plan),
  ],
);
