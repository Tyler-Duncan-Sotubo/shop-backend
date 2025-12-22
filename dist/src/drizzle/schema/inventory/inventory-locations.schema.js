"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const id_1 = require("../../id");
exports.inventoryLocations = (0, pg_core_1.pgTable)('inventory_locations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    code: (0, pg_core_1.text)('code'),
    type: (0, pg_core_1.text)('type').notNull().default('warehouse'),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    addressLine1: (0, pg_core_1.text)('address_line1'),
    addressLine2: (0, pg_core_1.text)('address_line2'),
    city: (0, pg_core_1.text)('city'),
    region: (0, pg_core_1.text)('region'),
    postalCode: (0, pg_core_1.text)('postal_code'),
    country: (0, pg_core_1.text)('country'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (t) => [
    (0, pg_core_1.index)('idx_inventory_locations_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_inventory_locations_store_id').on(t.storeId),
    (0, pg_core_1.index)('idx_inventory_locations_type').on(t.type),
    (0, pg_core_1.index)('idx_inventory_locations_is_active').on(t.isActive),
    (0, pg_core_1.uniqueIndex)('inventory_locations_store_code_unique').on(t.storeId, t.code),
]);
//# sourceMappingURL=inventory-locations.schema.js.map