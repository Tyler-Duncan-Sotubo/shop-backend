import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const permissions = pgTable(
  'permissions',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    key: varchar('key', { length: 150 }).notNull(), // e.g. "product.manage"
    description: text('description'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_permissions_key').on(table.key),
    index('idx_permissions_created_at').on(table.createdAt),
  ],
);
