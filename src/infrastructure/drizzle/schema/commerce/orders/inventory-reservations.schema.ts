import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id').notNull(),

    orderId: uuid('order_id').notNull(),
    locationId: uuid('location_id').notNull(),
    productVariantId: uuid('product_variant_id').notNull(),

    quantity: integer('quantity').notNull(),

    status: varchar('status', { length: 16 }).notNull(),
    // reserved | released | fulfilled

    expiresAt: timestamp('expires_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('reservation_order_idx').on(t.companyId, t.orderId),
    index('reservation_variant_idx').on(
      t.companyId,
      t.locationId,
      t.productVariantId,
    ),
    uniqueIndex('reservation_unique').on(
      t.companyId,
      t.orderId,
      t.locationId,
      t.productVariantId,
    ),
  ],
);
