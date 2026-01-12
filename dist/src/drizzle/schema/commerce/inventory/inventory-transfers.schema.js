"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryTransfers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const inventory_locations_schema_1 = require("./inventory-locations.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const id_1 = require("../../../id");
exports.inventoryTransfers = (0, pg_core_1.pgTable)('inventory_transfers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    fromLocationId: (0, pg_core_1.uuid)('from_location_id')
        .notNull()
        .references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'restrict' }),
    toLocationId: (0, pg_core_1.uuid)('to_location_id')
        .notNull()
        .references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'restrict' }),
    reference: (0, pg_core_1.text)('reference'),
    status: (0, pg_core_1.text)('status').notNull().default('pending'),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_inventory_transfers_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_inventory_transfers_from_location_id').on(table.fromLocationId),
    (0, pg_core_1.index)('idx_inventory_transfers_to_location_id').on(table.toLocationId),
    (0, pg_core_1.index)('idx_inventory_transfers_status').on(table.status),
]);
//# sourceMappingURL=inventory-transfers.schema.js.map