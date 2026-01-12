import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  text,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { inventoryLocations } from '../inventory/inventory-locations.schema';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../stores/stores.schema';

export const pickupLocations = pgTable(
  'pickup_locations',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    inventoryLocationId: uuid('inventory_location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'restrict' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 120 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    state: varchar('state', { length: 100 }).notNull(),
    address: jsonb('address').$type<Record<string, any>>().notNull(),
    instructions: text('instructions'),
    leadTimeMinutes: integer('lead_time_minutes'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('pickup_locations_company_idx').on(t.companyId),
    index('pickup_locations_active_idx').on(t.companyId, t.isActive),
    index('pickup_locations_store_idx').on(t.companyId, t.storeId),
  ],
);
