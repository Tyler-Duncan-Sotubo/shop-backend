"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryTransferItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const inventory_transfers_schema_1 = require("./inventory-transfers.schema");
const variants_schema_1 = require("../catalogs/variants.schema");
const id_1 = require("../../id");
exports.inventoryTransferItems = (0, pg_core_1.pgTable)('inventory_transfer_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    transferId: (0, pg_core_1.uuid)('transfer_id')
        .notNull()
        .references(() => inventory_transfers_schema_1.inventoryTransfers.id, { onDelete: 'cascade' }),
    productVariantId: (0, pg_core_1.uuid)('product_variant_id')
        .notNull()
        .references(() => variants_schema_1.productVariants.id, { onDelete: 'cascade' }),
    quantity: (0, pg_core_1.integer)('quantity').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_inventory_transfer_items_transfer_id').on(table.transferId),
    (0, pg_core_1.index)('idx_inventory_transfer_items_variant_id').on(table.productVariantId),
]);
//# sourceMappingURL=inventory-transfer-items.schema.js.map