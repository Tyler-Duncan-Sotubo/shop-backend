"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySettings = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("./companies.schema");
const id_1 = require("../../id");
exports.companySettings = (0, pg_core_1.pgTable)('company_settings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    key: (0, pg_core_1.varchar)('key', { length: 255 }).notNull(),
    value: (0, pg_core_1.jsonb)('value').$type().notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('company_settings_company_key_uq').on(table.companyId, table.key),
    (0, pg_core_1.index)('idx_company_settings_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_company_settings_key').on(table.key),
]);
//# sourceMappingURL=company-settings.schema.js.map