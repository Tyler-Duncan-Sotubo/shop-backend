// src/drizzle/schema/storefront/storefront-configs.schema.ts
import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { stores } from '../commerce/stores/stores.schema';
import { defaultId } from 'src/drizzle/id';

export const storefrontConfigs = pgTable(
  'storefront_configs',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    // keep it separated by concerns
    theme: jsonb('theme').notNull().default({}),
    header: jsonb('header').notNull().default({}),
    pages: jsonb('pages').notNull().default({}),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_storefront_configs_store_id').on(t.storeId), // 1 row per store for MVP
    index('idx_storefront_configs_store_id').on(t.storeId),
  ],
);
