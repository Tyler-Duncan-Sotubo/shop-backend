"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blogPostProductsRelations = exports.blogPostsRelations = exports.blogPostProducts = exports.blogPosts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const products_schema_1 = require("../catalogs/products.schema");
exports.blogPosts = (0, pg_core_1.pgTable)('blog_posts', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    title: (0, pg_core_1.varchar)('title', { length: 220 }).notNull(),
    slug: (0, pg_core_1.varchar)('slug', { length: 240 }).notNull(),
    excerpt: (0, pg_core_1.varchar)('excerpt', { length: 400 }),
    coverImageUrl: (0, pg_core_1.text)('cover_image_url'),
    focusKeyword: (0, pg_core_1.varchar)('focus_keyword', { length: 70 }),
    content: (0, pg_core_1.text)('content').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 20 }).notNull().default('draft'),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { withTimezone: true }),
    isFeatured: (0, pg_core_1.boolean)('is_featured').notNull().default(false),
    seoTitle: (0, pg_core_1.varchar)('seo_title', { length: 70 }),
    seoDescription: (0, pg_core_1.varchar)('seo_description', { length: 160 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('blog_posts_slug_uq').on(t.slug),
    (0, pg_core_1.index)('blog_posts_status_published_idx').on(t.status, t.publishedAt),
    (0, pg_core_1.index)('blog_posts_featured_idx').on(t.isFeatured, t.publishedAt),
]);
exports.blogPostProducts = (0, pg_core_1.pgTable)('blog_post_products', {
    postId: (0, pg_core_1.uuid)('post_id')
        .notNull()
        .references(() => exports.blogPosts.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.postId, t.productId] }),
    (0, pg_core_1.index)('blog_post_products_product_idx').on(t.productId),
    (0, pg_core_1.index)('blog_post_products_post_sort_idx').on(t.postId, t.sortOrder),
]);
exports.blogPostsRelations = (0, drizzle_orm_1.relations)(exports.blogPosts, ({ many }) => ({
    products: many(exports.blogPostProducts),
}));
exports.blogPostProductsRelations = (0, drizzle_orm_1.relations)(exports.blogPostProducts, ({ one }) => ({
    post: one(exports.blogPosts, {
        fields: [exports.blogPostProducts.postId],
        references: [exports.blogPosts.id],
    }),
    product: one(products_schema_1.products, {
        fields: [exports.blogPostProducts.productId],
        references: [products_schema_1.products.id],
    }),
}));
//# sourceMappingURL=blog.schema.js.map