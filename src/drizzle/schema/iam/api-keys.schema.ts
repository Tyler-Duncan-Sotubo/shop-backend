// src/drizzle/schema/iam/api-keys.schema.ts
import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../commerce/stores/stores.schema';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    name: varchar('name', { length: 150 }).notNull(),

    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    prefix: varchar('prefix', { length: 64 }).notNull(),

    scopes: text('scopes').array(),

    // 👇 ADD THIS
    allowedOrigins: text('allowed_origins').array(),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  },
  (table) => [
    uniqueIndex('uq_api_keys_prefix').on(table.prefix),
    index('idx_api_keys_company_id').on(table.companyId),
    index('idx_api_keys_is_active').on(table.isActive),
  ],
);
