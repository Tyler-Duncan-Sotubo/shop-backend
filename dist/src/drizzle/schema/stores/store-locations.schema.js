"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const inventory_locations_schema_1 = require("../inventory/inventory-locations.schema");
const stores_schema_1 = require("./stores.schema");
exports.storeLocations = (0, pg_core_1.pgTable)('store_locations', {
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    locationId: (0, pg_core_1.uuid)('location_id')
        .notNull()
        .references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'cascade' }),
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.primaryKey)({
        columns: [table.storeId, table.locationId],
        name: 'store_locations_pk',
    }),
    (0, pg_core_1.index)('idx_store_locations_store_id').on(table.storeId),
    (0, pg_core_1.index)('idx_store_locations_location_id').on(table.locationId),
]);
//# sourceMappingURL=store-locations.schema.js.map