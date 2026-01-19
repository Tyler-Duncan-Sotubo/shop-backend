import {
  pgTable,
  uuid,
  boolean,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { inventoryLocations } from '../inventory/inventory-locations.schema';
import { stores } from './stores.schema';

export const storeLocations = pgTable(
  'store_locations',
  {
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),

    isPrimary: boolean('is_primary').notNull().default(false),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.storeId, table.locationId],
      name: 'store_locations_pk',
    }),
    index('idx_store_locations_store_id').on(table.storeId),
    index('idx_store_locations_location_id').on(table.locationId),
  ],
);
