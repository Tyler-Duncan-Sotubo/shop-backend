// src/modules/billing/tax/schema/taxes.schema.ts
import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { stores } from '../../commerce/stores/stores.schema';
import { isNull } from 'drizzle-orm';

export const taxes = pgTable(
  'taxes',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // ✅ nullable for company default tax
    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    name: text('name').notNull(), // "VAT", "GST"
    code: text('code'), // optional: "VAT_NG"
    rateBps: integer('rate_bps').notNull(), // 750 = 7.5%

    // if true: prices already include tax
    isInclusive: boolean('is_inclusive').notNull().default(false),

    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // --------------------
    // Indexes
    // --------------------
    index('taxes_company_idx').on(t.companyId),
    index('taxes_company_store_idx').on(t.companyId, t.storeId),
    index('taxes_active_idx').on(t.companyId, t.storeId, t.isActive),

    // --------------------
    // Uniqueness rules
    // --------------------

    // 1️⃣ One tax name per (company + store)
    uniqueIndex('taxes_company_store_name_uq').on(
      t.companyId,
      t.storeId,
      t.name,
    ),

    // 2️⃣ Only ONE company default tax (storeId IS NULL)
    uniqueIndex('taxes_company_default_uq')
      .on(t.companyId)
      .where(isNull(t.storeId)),
  ],
);
