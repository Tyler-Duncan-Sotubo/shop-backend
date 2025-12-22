import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from './companies.schema';
import { defaultId } from 'src/drizzle/id';

export const companySettings = pgTable(
  'company_settings',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    key: varchar('key', { length: 255 }).notNull(),

    // value can be boolean, string, number, array, object...
    value: jsonb('value').$type<unknown>().notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    // guarantee uniqueness per company+key
    uniqueIndex('company_settings_company_key_uq').on(
      table.companyId,
      table.key,
    ),
    index('idx_company_settings_company_id').on(table.companyId),
    index('idx_company_settings_key').on(table.key),
  ],
);
