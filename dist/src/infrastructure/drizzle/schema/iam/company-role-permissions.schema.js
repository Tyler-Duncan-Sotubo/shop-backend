"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRolePermissions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const company_roles_schema_1 = require("./company-roles.schema");
const permissions_schema_1 = require("./permissions.schema");
const id_1 = require("../../id");
exports.companyRolePermissions = (0, pg_core_1.pgTable)('company_role_permissions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyRoleId: (0, pg_core_1.uuid)('company_role_id')
        .notNull()
        .references(() => company_roles_schema_1.companyRoles.id, { onDelete: 'cascade' }),
    permissionId: (0, pg_core_1.uuid)('permission_id')
        .notNull()
        .references(() => permissions_schema_1.permissions.id, { onDelete: 'cascade' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_crp_role_id').on(table.companyRoleId),
    (0, pg_core_1.index)('idx_crp_permission_id').on(table.permissionId),
    (0, pg_core_1.uniqueIndex)('uq_company_role_permission').on(table.companyRoleId, table.permissionId),
]);
//# sourceMappingURL=company-role-permissions.schema.js.map