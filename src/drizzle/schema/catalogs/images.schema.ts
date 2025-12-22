import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { products } from './products.schema';
import { productVariants } from './variants.schema';
import { defaultId } from 'src/drizzle/id';

export const productImages = pgTable(
  'product_images',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),

    url: text('url').notNull(),
    altText: text('alt_text'),

    position: integer('position').notNull().default(1),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    index('idx_product_images_product_position').on(
      table.productId,
      table.position,
    ),
    uniqueIndex('uq_product_images_variant').on(
      table.companyId,
      table.productId,
      table.variantId,
    ),
  ],
);
