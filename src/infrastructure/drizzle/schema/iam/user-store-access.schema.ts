// user-store-access.schema.ts
import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { users } from './users.schema';
import { stores } from '../commerce/stores/stores.schema';

export const userStoreAccess = pgTable(
  'user_store_access',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    grantedBy: uuid('granted_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    grantedAt: timestamp('granted_at', { mode: 'date' }).notNull().defaultNow(),

    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => [
    // One row per user-store pair
    uniqueIndex('uq_user_store_access').on(table.userId, table.storeId),
    index('idx_user_store_access_user_id').on(table.userId),
    index('idx_user_store_access_store_id').on(table.storeId),
  ],
);
