import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { products } from './products.schema';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../commerce/stores/stores.schema';
import { sql } from 'drizzle-orm';

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    parentId: uuid('parent_id').references(() => categories.id, {
      onDelete: 'set null',
    }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    afterContentHtml: text('after_content_html'),

    imageMediaId: uuid('image_media_id'),

    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),

    position: integer('position').notNull().default(1),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    // ✅ Store-specific uniqueness
    uniqueIndex('categories_company_store_slug_uq').on(
      table.companyId,
      table.storeId,
      table.slug,
    ),

    // ✅ Company-level (default) uniqueness
    uniqueIndex('categories_company_slug_default_uq')
      .on(table.companyId, table.slug)
      .where(sql`${table.storeId} IS NULL`),

    index('idx_categories_company_parent').on(table.companyId, table.parentId),
  ],
);

export const productCategories = pgTable(
  'product_categories',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // ✅ add these
    position: integer('position').notNull().default(1),
    pinned: boolean('pinned').notNull().default(false),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_categories_pk').on(table.productId, table.categoryId),
    index('idx_product_categories_category_id').on(table.categoryId),
    index('idx_product_categories_company_id').on(table.companyId),
  ],
);
