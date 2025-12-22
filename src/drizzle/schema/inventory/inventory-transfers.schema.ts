import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { inventoryLocations } from './inventory-locations.schema';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/drizzle/id';

export const inventoryTransfers = pgTable(
  'inventory_transfers',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    fromLocationId: uuid('from_location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'restrict' }),

    toLocationId: uuid('to_location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'restrict' }),

    // Optional human-readable transfer code shown in admin UI
    reference: text('reference'), // e.g. "TRF-2025-0001"

    // "pending" | "in_transit" | "completed" | "cancelled"
    status: text('status').notNull().default('pending'),

    notes: text('notes'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (table) => [
    index('idx_inventory_transfers_company_id').on(table.companyId),
    index('idx_inventory_transfers_from_location_id').on(table.fromLocationId),
    index('idx_inventory_transfers_to_location_id').on(table.toLocationId),
    index('idx_inventory_transfers_status').on(table.status),
  ],
);
