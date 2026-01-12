"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.taxes = (0, pg_core_1.pgTable)('taxes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    code: (0, pg_core_1.text)('code'),
    rateBps: (0, pg_core_1.integer)('rate_bps').notNull(),
    isInclusive: (0, pg_core_1.boolean)('is_inclusive').notNull().default(false),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('taxes_company_idx').on(t.companyId),
    (0, pg_core_1.index)('taxes_company_store_idx').on(t.companyId, t.storeId),
    (0, pg_core_1.index)('taxes_active_idx').on(t.companyId, t.storeId, t.isActive),
    (0, pg_core_1.uniqueIndex)('taxes_company_store_name_uq').on(t.companyId, t.storeId, t.name),
    (0, pg_core_1.uniqueIndex)('taxes_company_default_uq')
        .on(t.companyId)
        .where((0, drizzle_orm_1.isNull)(t.storeId)),
]);
//# sourceMappingURL=taxes.schema.js.map