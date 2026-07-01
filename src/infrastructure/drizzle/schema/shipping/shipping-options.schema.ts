import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { stores } from '../commerce/stores/stores.schema';

export const shippingOptions = pgTable(
  'shipping_options',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // e.g. "Lagos Island", "Nationwide"

    // string[] of Nigerian state names; empty = catch-all (applies to any state)
    states: jsonb('states').$type<string[]>().notNull().default([]),

    price: numeric('price', { precision: 10, scale: 2 }).notNull().default('0'),

    isActive: boolean('is_active').notNull().default(true),

    sortOrder: integer('sort_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('shipping_options_company_idx').on(t.companyId),
    index('shipping_options_company_store_idx').on(t.companyId, t.storeId),
    index('shipping_options_company_active_idx').on(t.companyId, t.isActive),
  ],
);
