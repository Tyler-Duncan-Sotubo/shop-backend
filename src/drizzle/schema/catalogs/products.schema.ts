import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  varchar,
  uniqueIndex,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { productStatusEnum, productTypeEnum } from '../enum.schema';
import { defaultId } from 'src/drizzle/id';
import { productImages } from './images.schema';
import { stores } from '../commerce/stores/stores.schema';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),

    slug: text('slug').notNull(),

    status: productStatusEnum('status').notNull().default('draft'),
    isGiftCard: boolean('is_gift_card').notNull().default(false),
    productType: productTypeEnum('product_type').notNull().default('simple'),

    defaultVariantId: uuid('default_variant_id'),
    defaultImageId: uuid('default_image_id').references(
      () => productImages.id,
      {
        onDelete: 'set null',
      },
    ),

    seoTitle: varchar('seo_title', { length: 255 }),
    seoDescription: text('seo_description'),

    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (t) => [
    uniqueIndex('products_store_slug_unique').on(
      t.companyId,
      t.storeId,
      t.slug,
    ),
    index('idx_products_company_id').on(t.companyId),
    index('idx_products_store_id').on(t.storeId),
    index('idx_products_company_status').on(t.companyId, t.status),
  ],
);
