import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  uniqueIndex,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { products } from '../../catalogs/products.schema';

/** BLOG POSTS (simple) */
export const blogPosts = pgTable(
  'blog_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    title: varchar('title', { length: 220 }).notNull(),
    slug: varchar('slug', { length: 240 }).notNull(),

    storeId: uuid('store_id').notNull(),

    excerpt: varchar('excerpt', { length: 400 }),
    coverImageUrl: text('cover_image_url'),

    focusKeyword: varchar('focus_keyword', { length: 70 }),

    // markdown or html (your choice)
    content: text('content').notNull(),

    // publish controls
    status: varchar('status', { length: 20 }).notNull().default('draft'), // draft | published
    publishedAt: timestamp('published_at', { withTimezone: true }),

    // merch/placement
    isFeatured: boolean('is_featured').notNull().default(false),

    // lightweight SEO
    seoTitle: varchar('seo_title', { length: 70 }),
    seoDescription: varchar('seo_description', { length: 160 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('blog_posts_slug_uq').on(t.slug),
    index('blog_posts_status_published_idx').on(t.status, t.publishedAt),
    index('blog_posts_featured_idx').on(t.isFeatured, t.publishedAt),
  ],
);

/** JOIN: BLOG POST ↔ PRODUCT (many-to-many) */
export const blogPostProducts = pgTable(
  'blog_post_products',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => blogPosts.id, { onDelete: 'cascade' }),

    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),

    // optional: control ordering of products inside a post
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.productId] }),
    index('blog_post_products_product_idx').on(t.productId),
    index('blog_post_products_post_sort_idx').on(t.postId, t.sortOrder),
  ],
);

/** RELATIONS (optional but recommended) */
export const blogPostsRelations = relations(blogPosts, ({ many }) => ({
  products: many(blogPostProducts),
}));

export const blogPostProductsRelations = relations(
  blogPostProducts,
  ({ one }) => ({
    post: one(blogPosts, {
      fields: [blogPostProducts.postId],
      references: [blogPosts.id],
    }),
    product: one(products, {
      fields: [blogPostProducts.productId],
      references: [products.id],
    }),
  }),
);
