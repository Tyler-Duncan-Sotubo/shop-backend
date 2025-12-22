"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceSeries = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../../stores/stores.schema");
const enum_schema_1 = require("../../enum.schema");
exports.invoiceSeries = (0, pg_core_1.pgTable)('invoice_series', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    type: (0, enum_schema_1.invoiceTypeEnum)('type').notNull().default('invoice'),
    name: (0, pg_core_1.text)('name').notNull(),
    prefix: (0, pg_core_1.text)('prefix').notNull(),
    suffix: (0, pg_core_1.text)('suffix'),
    padding: (0, pg_core_1.integer)('padding').notNull().default(6),
    nextNumber: (0, pg_core_1.integer)('next_number').notNull().default(1),
    year: (0, pg_core_1.integer)('year'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('invoice_series_company_idx').on(t.companyId),
    (0, pg_core_1.uniqueIndex)('invoice_series_company_name_uq').on(t.companyId, t.name, t.storeId, t.year),
    (0, pg_core_1.uniqueIndex)('invoice_series_company_prefix_uq').on(t.companyId, t.prefix, t.storeId, t.year),
]);
//# sourceMappingURL=invoice-series.schema.js.map