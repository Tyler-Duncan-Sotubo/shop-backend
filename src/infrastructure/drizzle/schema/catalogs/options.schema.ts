import {
  pgTable,
  uuid,
  timestamp,
  integer,
  varchar,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { products } from './products.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const productOptions = pgTable(
  'product_options',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    // e.g. "Size", "Color"
    name: varchar('name', { length: 255 }).notNull(),

    // 1, 2, 3 → lines up with option1/option2/option3 on variants
    position: integer('position').notNull().default(1),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    // Only one "Size" per product, etc.
    uniqueIndex('product_options_product_name_unique').on(
      table.productId,
      table.name,
    ),
  ],
);

export const productOptionValues = pgTable(
  'product_option_values',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    productOptionId: uuid('product_option_id')
      .notNull()
      .references(() => productOptions.id, { onDelete: 'cascade' }),

    // e.g. "S", "M", "L", "Red"
    value: varchar('value', { length: 255 }).notNull(),

    position: integer('position').notNull().default(1),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    // No duplicate value per option ("M" twice for the same Size option)
    uniqueIndex('product_option_values_option_value_unique').on(
      table.productOptionId,
      table.value,
    ),
  ],
);
