"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productImages = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const products_schema_1 = require("./products.schema");
const variants_schema_1 = require("./variants.schema");
const id_1 = require("../../id");
exports.productImages = (0, pg_core_1.pgTable)('product_images', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    variantId: (0, pg_core_1.uuid)('variant_id').references(() => variants_schema_1.productVariants.id, {
        onDelete: 'set null',
    }),
    url: (0, pg_core_1.text)('url').notNull(),
    altText: (0, pg_core_1.text)('alt_text'),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_product_images_product_position').on(table.productId, table.position),
    (0, pg_core_1.uniqueIndex)('uq_product_images_variant').on(table.companyId, table.productId, table.variantId),
]);
//# sourceMappingURL=images.schema.js.map