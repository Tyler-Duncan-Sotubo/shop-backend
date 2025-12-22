import { pgTable, uuid, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { inventoryTransfers } from './inventory-transfers.schema';
import { productVariants } from '../catalogs/variants.schema';
import { defaultId } from 'src/drizzle/id';

export const inventoryTransferItems = pgTable(
  'inventory_transfer_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    transferId: uuid('transfer_id')
      .notNull()
      .references(() => inventoryTransfers.id, { onDelete: 'cascade' }),

    productVariantId: uuid('product_variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }), // TODO update this back to str 'restrict' later

    quantity: integer('quantity').notNull(), // > 0

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_inventory_transfer_items_transfer_id').on(table.transferId),
    index('idx_inventory_transfer_items_variant_id').on(table.productVariantId),
  ],
);
