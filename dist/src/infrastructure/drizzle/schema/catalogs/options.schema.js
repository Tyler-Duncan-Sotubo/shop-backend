"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productOptionValues = exports.productOptions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const products_schema_1 = require("./products.schema");
const id_1 = require("../../id");
exports.productOptions = (0, pg_core_1.pgTable)('product_options', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('product_options_product_name_unique').on(table.productId, table.name),
]);
exports.productOptionValues = (0, pg_core_1.pgTable)('product_option_values', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    productOptionId: (0, pg_core_1.uuid)('product_option_id')
        .notNull()
        .references(() => exports.productOptions.id, { onDelete: 'cascade' }),
    value: (0, pg_core_1.varchar)('value', { length: 255 }).notNull(),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('product_option_values_option_value_unique').on(table.productOptionId, table.value),
]);
//# sourceMappingURL=options.schema.js.map