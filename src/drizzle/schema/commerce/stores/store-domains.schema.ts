import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { stores } from './stores.schema';
import { defaultId } from 'src/drizzle/id';

export const storeDomains = pgTable(
  'store_domains',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    domain: text('domain').notNull(), // e.g. "shop.mybrand.com"

    isPrimary: boolean('is_primary').notNull().default(false),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    uniqueIndex('store_domains_domain_unique').on(table.domain),
    index('idx_store_domains_store_id').on(table.storeId),
  ],
);
