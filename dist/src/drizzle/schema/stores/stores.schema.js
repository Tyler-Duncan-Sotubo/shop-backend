"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stores = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
exports.stores = (0, pg_core_1.pgTable)('stores', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    slug: (0, pg_core_1.text)('slug').notNull(),
    imageUrl: (0, pg_core_1.text)('image_url'),
    imageAltText: (0, pg_core_1.text)('image_alt_text'),
    defaultCurrency: (0, pg_core_1.text)('default_currency').notNull().default('USD'),
    defaultLocale: (0, pg_core_1.text)('default_locale').notNull().default('en'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('stores_company_slug_unique').on(table.companyId, table.slug),
    (0, pg_core_1.index)('idx_stores_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_stores_is_active').on(table.isActive),
]);
//# sourceMappingURL=stores.schema.js.map