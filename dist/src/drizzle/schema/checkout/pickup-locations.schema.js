"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickupLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const inventory_locations_schema_1 = require("../inventory/inventory-locations.schema");
const id_1 = require("../../id");
const stores_schema_1 = require("../stores/stores.schema");
exports.pickupLocations = (0, pg_core_1.pgTable)('pickup_locations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    inventoryLocationId: (0, pg_core_1.uuid)('inventory_location_id')
        .notNull()
        .references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'restrict' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 120 }).notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    state: (0, pg_core_1.varchar)('state', { length: 100 }).notNull(),
    address: (0, pg_core_1.jsonb)('address').$type().notNull(),
    instructions: (0, pg_core_1.text)('instructions'),
    leadTimeMinutes: (0, pg_core_1.integer)('lead_time_minutes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('pickup_locations_company_idx').on(t.companyId),
    (0, pg_core_1.index)('pickup_locations_active_idx').on(t.companyId, t.isActive),
    (0, pg_core_1.index)('pickup_locations_store_idx').on(t.companyId, t.storeId),
]);
//# sourceMappingURL=pickup-locations.schema.js.map