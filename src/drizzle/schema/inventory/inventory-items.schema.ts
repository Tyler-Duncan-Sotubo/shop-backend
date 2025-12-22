import {
  pgTable,
  uuid,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { inventoryLocations } from './inventory-locations.schema';
import { defaultId } from 'src/drizzle/id';
import { productVariants } from '../catalogs/variants.schema';
import { stores } from '../stores/stores.schema';

export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    productVariantId: uuid('product_variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),

    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),

    available: integer('available').notNull().default(0),
    reserved: integer('reserved').notNull().default(0),
    safetyStock: integer('safety_stock').notNull().default(0),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_inventory_items_company_id').on(t.companyId),
    index('idx_inventory_items_store_id').on(t.storeId),
    index('idx_inventory_items_location_id').on(t.locationId),
    index('idx_inventory_items_variant_id').on(t.productVariantId),

    // One row per (store, variant, location)
    uniqueIndex('inventory_items_store_variant_location_unique').on(
      t.storeId,
      t.productVariantId,
      t.locationId,
    ),
  ],
);
