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
import { stores } from '../stores/stores.schema';
import { defaultId } from 'src/drizzle/id';

export const inventoryLocations = pgTable(
  'inventory_locations',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // ✅ Location belongs to ONE store
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // "Main Warehouse", "Backroom"
    code: text('code'), // optional shorthand

    // "warehouse" | "store" | "dropship" | ...
    type: text('type').notNull().default('warehouse'),

    // ✅ single “default” location per store for your auto-allocation
    isDefault: boolean('is_default').notNull().default(false),

    addressLine1: text('address_line1'),
    addressLine2: text('address_line2'),
    city: text('city'),
    region: text('region'),
    postalCode: text('postal_code'),
    country: text('country'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (t) => [
    index('idx_inventory_locations_company_id').on(t.companyId),
    index('idx_inventory_locations_store_id').on(t.storeId),
    index('idx_inventory_locations_type').on(t.type),
    index('idx_inventory_locations_is_active').on(t.isActive),

    // ✅ code uniqueness should usually be per store (not per company)
    uniqueIndex('inventory_locations_store_code_unique').on(t.storeId, t.code),
  ],
);
