import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { stores } from '../../commerce/stores/stores.schema';

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    // ✅ File identity
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),

    url: text('url').notNull(),
    storageKey: text('storage_key'),

    // ✅ Useful metadata
    size: integer('size'), // bytes
    width: integer('width'),
    height: integer('height'),

    altText: text('alt_text'),

    // Optional classification
    folder: text('folder'), // e.g. "brand", "uploads", "quotes"
    tag: text('tag'), // lightweight tagging

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    index('idx_media_company').on(table.companyId),
    index('idx_media_folder').on(table.companyId, table.folder),
  ],
);
