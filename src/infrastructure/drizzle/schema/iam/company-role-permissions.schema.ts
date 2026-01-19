import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companyRoles } from './company-roles.schema';
import { permissions } from './permissions.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const companyRolePermissions = pgTable(
  'company_role_permissions',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyRoleId: uuid('company_role_id')
      .notNull()
      .references(() => companyRoles.id, { onDelete: 'cascade' }),

    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_crp_role_id').on(table.companyRoleId),
    index('idx_crp_permission_id').on(table.permissionId),
    uniqueIndex('uq_company_role_permission').on(
      table.companyRoleId,
      table.permissionId,
    ),
  ],
);
