"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productCategories = exports.categories = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const products_schema_1 = require("./products.schema");
const id_1 = require("../../id");
const stores_schema_1 = require("../commerce/stores/stores.schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.categories = (0, pg_core_1.pgTable)('categories', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    parentId: (0, pg_core_1.uuid)('parent_id').references(() => exports.categories.id, {
        onDelete: 'set null',
    }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    slug: (0, pg_core_1.text)('slug').notNull(),
    description: (0, pg_core_1.text)('description'),
    afterContentHtml: (0, pg_core_1.text)('after_content_html'),
    imageMediaId: (0, pg_core_1.uuid)('image_media_id'),
    metaTitle: (0, pg_core_1.text)('meta_title'),
    metaDescription: (0, pg_core_1.text)('meta_description'),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('categories_company_store_slug_uq').on(table.companyId, table.storeId, table.slug),
    (0, pg_core_1.uniqueIndex)('categories_company_slug_default_uq')
        .on(table.companyId, table.slug)
        .where((0, drizzle_orm_1.sql) `${table.storeId} IS NULL`),
    (0, pg_core_1.index)('idx_categories_company_parent').on(table.companyId, table.parentId),
]);
exports.productCategories = (0, pg_core_1.pgTable)('product_categories', {
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    categoryId: (0, pg_core_1.uuid)('category_id')
        .notNull()
        .references(() => exports.categories.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    pinned: (0, pg_core_1.boolean)('pinned').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('product_categories_pk').on(table.productId, table.categoryId),
    (0, pg_core_1.index)('idx_product_categories_category_id').on(table.categoryId),
    (0, pg_core_1.index)('idx_product_categories_company_id').on(table.companyId),
]);
//# sourceMappingURL=categories.schema.js.map