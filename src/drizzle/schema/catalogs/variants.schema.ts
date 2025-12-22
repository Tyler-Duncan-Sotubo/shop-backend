import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  varchar,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { products } from './products.schema';
import { defaultId } from 'src/drizzle/id';
import { productImages } from './images.schema';
import { stores } from '../stores/stores.schema';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    varId: integer('var_id').generatedAlwaysAsIdentity(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    imageId: uuid('image_id').references(() => productImages.id, {
      onDelete: 'set null',
    }),

    // SKU is unique per company (nullable allowed)
    sku: varchar('sku', { length: 64 }),
    barcode: varchar('barcode', { length: 64 }),

    // Human-friendly variant title, e.g. "Red / M"
    title: text('title'),

    // Denormalised option values (linked to product_options by position)
    option1: varchar('option1', { length: 255 }),
    option2: varchar('option2', { length: 255 }),
    option3: varchar('option3', { length: 255 }),

    isActive: boolean('is_active').notNull().default(true),

    // --- Pricing ---
    // Base / regular price of this variant
    regularPrice: numeric('regular_price', {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Optional sale/discounted price
    salePrice: numeric('sale_price', { precision: 10, scale: 2 }),
    saleStartAt: timestamp('sale_start_at', { mode: 'date' }),
    saleEndAt: timestamp('sale_end_at', { mode: 'date' }),

    // Currency for this price (base currency of catalog/company)
    currency: varchar('currency', { length: 10 }).notNull().default('NGN'),

    // Dimensions; decide on units globally (e.g. kg / cm)
    weight: numeric('weight', { precision: 10, scale: 3 }),
    length: numeric('length', { precision: 10, scale: 2 }),
    width: numeric('width', { precision: 10, scale: 2 }),
    height: numeric('height', { precision: 10, scale: 2 }),

    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    index('idx_variants_company_id').on(table.companyId),
    index('idx_variants_store_id').on(table.storeId),
    index('idx_variants_product_id').on(table.productId),
    uniqueIndex('variants_company_sku_unique').on(table.companyId, table.sku),
  ],
);
