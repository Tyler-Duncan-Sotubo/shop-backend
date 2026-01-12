import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../commerce/stores/stores.schema';

export const shippingZones = pgTable(
  'shipping_zones',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // e.g., "Lagos", "Abuja (FCT)", "Nationwide"
    isActive: boolean('is_active').notNull().default(true),

    // lower number = higher priority (useful when multiple zones could match)
    priority: integer('priority').notNull().default(0),

    description: text('description'),

    // optional flags: "nigeriaOnly": true, "notes": ...
    metadata: jsonb('metadata').$type<Record<string, any>>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('shipping_zones_company_idx').on(t.companyId),
    index('shipping_zones_company_active_idx').on(t.companyId, t.isActive),
    index('shipping_zones_company_priority_idx').on(t.companyId, t.priority),
    uniqueIndex('shipping_zones_company_name_uniq').on(t.storeId, t.name),
  ],
);
