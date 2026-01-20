"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRoles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
exports.companyRoles = (0, pg_core_1.pgTable)('company_roles', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 64 }).notNull(),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 128 }),
    description: (0, pg_core_1.varchar)('description', { length: 255 }),
    isSystem: (0, pg_core_1.boolean)('is_system').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_company_roles_company_id').on(table.companyId),
    (0, pg_core_1.uniqueIndex)('uq_company_roles_company_name').on(table.companyId, table.name),
]);
//# sourceMappingURL=company-roles.schema.js.map