"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.products = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const enum_schema_1 = require("../enum.schema");
const id_1 = require("../../id");
const images_schema_1 = require("./images.schema");
const stores_schema_1 = require("../stores/stores.schema");
exports.products = (0, pg_core_1.pgTable)('products', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    slug: (0, pg_core_1.text)('slug').notNull(),
    status: (0, enum_schema_1.productStatusEnum)('status').notNull().default('draft'),
    isGiftCard: (0, pg_core_1.boolean)('is_gift_card').notNull().default(false),
    productType: (0, enum_schema_1.productTypeEnum)('product_type').notNull().default('simple'),
    defaultVariantId: (0, pg_core_1.uuid)('default_variant_id'),
    defaultImageId: (0, pg_core_1.uuid)('default_image_id').references(() => images_schema_1.productImages.id, {
        onDelete: 'set null',
    }),
    seoTitle: (0, pg_core_1.varchar)('seo_title', { length: 255 }),
    seoDescription: (0, pg_core_1.text)('seo_description'),
    metadata: (0, pg_core_1.jsonb)('metadata').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('products_store_slug_unique').on(t.companyId, t.storeId, t.slug),
    (0, pg_core_1.index)('idx_products_company_id').on(t.companyId),
    (0, pg_core_1.index)('idx_products_store_id').on(t.storeId),
    (0, pg_core_1.index)('idx_products_company_status').on(t.companyId, t.status),
]);
//# sourceMappingURL=products.schema.js.map