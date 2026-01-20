import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const companyRoles = pgTable(
  'company_roles',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 128 }),
    description: varchar('description', { length: 255 }),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_company_roles_company_id').on(table.companyId),
    uniqueIndex('uq_company_roles_company_name').on(
      table.companyId,
      table.name,
    ),
  ],
);
