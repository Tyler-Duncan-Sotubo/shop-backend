// src/db/schema/catalog/product-links.schema.ts
import {
  pgTable,
  uuid,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { products } from './products.schema';
import { productLinkTypeEnum } from '../enum.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const productLinks = pgTable(
  'product_links',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    linkedProductId: uuid('linked_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    linkType: productLinkTypeEnum('link_type').notNull().default('related'),

    position: integer('position').notNull().default(1),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('product_links_unique').on(
      table.companyId,
      table.productId,
      table.linkedProductId,
      table.linkType,
    ),
  ],
);
