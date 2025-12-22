"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingZones = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
const stores_schema_1 = require("../stores/stores.schema");
exports.shippingZones = (0, pg_core_1.pgTable)('shipping_zones', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    priority: (0, pg_core_1.integer)('priority').notNull().default(0),
    description: (0, pg_core_1.text)('description'),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('shipping_zones_company_idx').on(t.companyId),
    (0, pg_core_1.index)('shipping_zones_company_active_idx').on(t.companyId, t.isActive),
    (0, pg_core_1.index)('shipping_zones_company_priority_idx').on(t.companyId, t.priority),
    (0, pg_core_1.uniqueIndex)('shipping_zones_company_name_uniq').on(t.storeId, t.name),
]);
//# sourceMappingURL=shipping-zones.schema.js.map