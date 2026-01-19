// src/drizzle/schema/productReviews.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { products } from './products.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { stores } from '../commerce/stores/stores.schema';

export const productReviews = pgTable(
  'product_reviews',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id').notNull(), // keep multi-tenant consistent

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'set null',
    }),

    // Optional user linkage (nullable => guests allowed)
    userId: uuid('user_id'),

    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),

    rating: integer('rating').notNull(), // enforce 1..5 in DTO/service
    review: text('review').notNull(),

    // moderation
    isApproved: boolean('is_approved').notNull().default(true),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    moderatedByUserId: uuid('moderated_by_user_id'),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderationNote: text('moderation_note'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('product_reviews_company_idx').on(t.companyId),
    index('product_reviews_product_idx').on(t.productId),
    index('product_reviews_created_idx').on(t.createdAt),
    index('product_reviews_approved_idx').on(t.isApproved),
  ],
);
