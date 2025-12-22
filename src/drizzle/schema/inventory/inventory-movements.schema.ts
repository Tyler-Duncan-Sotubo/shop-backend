import {
  pgTable,
  uuid,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../companies/companies.schema';
import { inventoryLocations } from './inventory-locations.schema';
import { productVariants } from '../catalogs/variants.schema';
import { stores } from '../stores/stores.schema';

export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    locationId: uuid('location_id')
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    productVariantId: uuid('product_variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),

    /**
     * Positive = stock increases
     * Negative = stock decreases
     */
    deltaAvailable: integer('delta_available').notNull().default(0),
    deltaReserved: integer('delta_reserved').notNull().default(0),

    /**
     * What caused this movement
     * examples: reserve, release, fulfill, restock, adjustment, transfer_out, transfer_in
     */
    type: text('type').notNull(),

    /** Linking back to business entity (order, transfer, adjustment, etc.) */
    refType: text('ref_type'),
    refId: uuid('ref_id'),

    actorUserId: uuid('actor_user_id'),
    ipAddress: text('ip_address'),

    note: text('note'),
    meta: jsonb('meta'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('inventory_movements_company_idx').on(t.companyId),
    index('inventory_movements_location_idx').on(t.locationId),
    index('inventory_movements_variant_idx').on(t.productVariantId),
    index('inventory_movements_ref_idx').on(t.refType, t.refId),
    index('inventory_movements_created_idx').on(t.createdAt),
  ],
);
