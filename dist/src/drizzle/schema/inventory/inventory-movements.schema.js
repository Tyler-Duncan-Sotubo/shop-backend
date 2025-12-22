"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryMovements = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const inventory_locations_schema_1 = require("./inventory-locations.schema");
const variants_schema_1 = require("../catalogs/variants.schema");
const stores_schema_1 = require("../stores/stores.schema");
exports.inventoryMovements = (0, pg_core_1.pgTable)('inventory_movements', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    locationId: (0, pg_core_1.uuid)('location_id')
        .notNull()
        .references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    productVariantId: (0, pg_core_1.uuid)('product_variant_id')
        .notNull()
        .references(() => variants_schema_1.productVariants.id, { onDelete: 'cascade' }),
    deltaAvailable: (0, pg_core_1.integer)('delta_available').notNull().default(0),
    deltaReserved: (0, pg_core_1.integer)('delta_reserved').notNull().default(0),
    type: (0, pg_core_1.text)('type').notNull(),
    refType: (0, pg_core_1.text)('ref_type'),
    refId: (0, pg_core_1.uuid)('ref_id'),
    actorUserId: (0, pg_core_1.uuid)('actor_user_id'),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    note: (0, pg_core_1.text)('note'),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('inventory_movements_company_idx').on(t.companyId),
    (0, pg_core_1.index)('inventory_movements_location_idx').on(t.locationId),
    (0, pg_core_1.index)('inventory_movements_variant_idx').on(t.productVariantId),
    (0, pg_core_1.index)('inventory_movements_ref_idx').on(t.refType, t.refId),
    (0, pg_core_1.index)('inventory_movements_created_idx').on(t.createdAt),
]);
//# sourceMappingURL=inventory-movements.schema.js.map