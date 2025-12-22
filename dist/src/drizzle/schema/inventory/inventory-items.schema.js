"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const inventory_locations_schema_1 = require("./inventory-locations.schema");
const id_1 = require("../../id");
const variants_schema_1 = require("../catalogs/variants.schema");
const stores_schema_1 = require("../stores/stores.schema");
exports.inventoryItems = (0, pg_core_1.pgTable)('inventory_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    productVariantId: (0, pg_core_1.uuid)('product_variant_id')
        .notNull()
        .references(() => variants_schema_1.productVariants.id, { onDelete: 'cascade' }),
    locationId: (0, pg_core_1.uuid)('location_id')
        .notNull()
        .references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'cascade' }),
    available: (0, pg_core_1.integer)('available').notNull().default(0),
    reserved: (0, pg_core_1.integer)('reserved').notNull().default(0),
    safetyStock: (0, pg_core_1.integer)('safety_stock').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('idx_inventory_items_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_inventory_items_store_id').on(t.storeId),
    (0, pg_core_1.index)('idx_inventory_items_location_id').on(t.locationId),
    (0, pg_core_1.index)('idx_inventory_items_variant_id').on(t.productVariantId),
    (0, pg_core_1.uniqueIndex)('inventory_items_store_variant_location_unique').on(t.storeId, t.productVariantId, t.locationId),
]);
//# sourceMappingURL=inventory-items.schema.js.map