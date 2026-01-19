import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    slug: text('slug').notNull(), // used in /storefront/:slug/...
    imageUrl: text('image_url'),
    imageAltText: text('image_alt_text'),

    defaultCurrency: text('default_currency').notNull().default('USD'),
    defaultLocale: text('default_locale').notNull().default('en'),
    supportedCurrencies: text('supported_currencies').array(),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    // Each company can reuse slugs that other companies use, but not within itself.
    uniqueIndex('stores_company_slug_unique').on(table.companyId, table.slug),
    index('idx_stores_company_id').on(table.companyId),
    index('idx_stores_is_active').on(table.isActive),
  ],
);
