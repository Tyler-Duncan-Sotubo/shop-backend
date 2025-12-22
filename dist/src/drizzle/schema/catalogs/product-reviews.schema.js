"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productReviews = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const products_schema_1 = require("./products.schema");
const id_1 = require("../../id");
const stores_schema_1 = require("../stores/stores.schema");
exports.productReviews = (0, pg_core_1.pgTable)('product_reviews', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    userId: (0, pg_core_1.uuid)('user_id'),
    authorName: (0, pg_core_1.text)('author_name').notNull(),
    authorEmail: (0, pg_core_1.text)('author_email').notNull(),
    rating: (0, pg_core_1.integer)('rating').notNull(),
    review: (0, pg_core_1.text)('review').notNull(),
    isApproved: (0, pg_core_1.boolean)('is_approved').notNull().default(true),
    approvedAt: (0, pg_core_1.timestamp)('approved_at', { withTimezone: true }),
    moderatedByUserId: (0, pg_core_1.uuid)('moderated_by_user_id'),
    moderatedAt: (0, pg_core_1.timestamp)('moderated_at', { withTimezone: true }),
    moderationNote: (0, pg_core_1.text)('moderation_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('product_reviews_company_idx').on(t.companyId),
    (0, pg_core_1.index)('product_reviews_product_idx').on(t.productId),
    (0, pg_core_1.index)('product_reviews_created_idx').on(t.createdAt),
    (0, pg_core_1.index)('product_reviews_approved_idx').on(t.isApproved),
]);
//# sourceMappingURL=product-reviews.schema.js.map