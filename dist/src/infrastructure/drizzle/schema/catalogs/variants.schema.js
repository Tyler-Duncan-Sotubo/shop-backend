"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productVariants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const products_schema_1 = require("./products.schema");
const id_1 = require("../../id");
const images_schema_1 = require("./images.schema");
const stores_schema_1 = require("../commerce/stores/stores.schema");
exports.productVariants = (0, pg_core_1.pgTable)('product_variants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    varId: (0, pg_core_1.integer)('var_id').generatedAlwaysAsIdentity(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    imageId: (0, pg_core_1.uuid)('image_id').references(() => images_schema_1.productImages.id, {
        onDelete: 'set null',
    }),
    sku: (0, pg_core_1.varchar)('sku', { length: 64 }),
    barcode: (0, pg_core_1.varchar)('barcode', { length: 64 }),
    title: (0, pg_core_1.text)('title'),
    option1: (0, pg_core_1.varchar)('option1', { length: 255 }),
    option2: (0, pg_core_1.varchar)('option2', { length: 255 }),
    option3: (0, pg_core_1.varchar)('option3', { length: 255 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    regularPrice: (0, pg_core_1.numeric)('regular_price', {
        precision: 10,
        scale: 2,
    }).notNull(),
    salePrice: (0, pg_core_1.numeric)('sale_price', { precision: 10, scale: 2 }),
    saleStartAt: (0, pg_core_1.timestamp)('sale_start_at', { mode: 'date' }),
    saleEndAt: (0, pg_core_1.timestamp)('sale_end_at', { mode: 'date' }),
    currency: (0, pg_core_1.varchar)('currency', { length: 10 }).notNull().default('NGN'),
    weight: (0, pg_core_1.numeric)('weight', { precision: 10, scale: 3 }),
    length: (0, pg_core_1.numeric)('length', { precision: 10, scale: 2 }),
    width: (0, pg_core_1.numeric)('width', { precision: 10, scale: 2 }),
    height: (0, pg_core_1.numeric)('height', { precision: 10, scale: 2 }),
    metadata: (0, pg_core_1.jsonb)('metadata').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_variants_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_variants_store_id').on(table.storeId),
    (0, pg_core_1.index)('idx_variants_product_id').on(table.productId),
    (0, pg_core_1.uniqueIndex)('variants_company_sku_unique').on(table.companyId, table.sku),
]);
//# sourceMappingURL=variants.schema.js.map