"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const carts_schema_1 = require("./carts.schema");
const products_schema_1 = require("../catalogs/products.schema");
const variants_schema_1 = require("../catalogs/variants.schema");
const drizzle_orm_1 = require("drizzle-orm");
const id_1 = require("../../id");
exports.cartItems = (0, pg_core_1.pgTable)('cart_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    cartId: (0, pg_core_1.uuid)('cart_id')
        .notNull()
        .references(() => carts_schema_1.carts.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'restrict' }),
    variantId: (0, pg_core_1.uuid)('variant_id').references(() => variants_schema_1.productVariants.id, {
        onDelete: 'restrict',
    }),
    sku: (0, pg_core_1.varchar)('sku', { length: 64 }),
    name: (0, pg_core_1.text)('name').notNull(),
    quantity: (0, pg_core_1.integer)('quantity').notNull().default(1),
    unitPrice: (0, pg_core_1.numeric)('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineSubtotal: (0, pg_core_1.numeric)('line_subtotal', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    lineDiscountTotal: (0, pg_core_1.numeric)('line_discount_total', {
        precision: 12,
        scale: 2,
    })
        .notNull()
        .default('0'),
    lineTaxTotal: (0, pg_core_1.numeric)('line_tax_total', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    lineTotal: (0, pg_core_1.numeric)('line_total', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    attributes: (0, pg_core_1.jsonb)('attributes').$type(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('cart_items_company_idx').on(t.companyId),
    (0, pg_core_1.index)('cart_items_cart_idx').on(t.cartId),
    (0, pg_core_1.index)('cart_items_product_idx').on(t.productId),
    (0, pg_core_1.index)('cart_items_variant_idx').on(t.variantId),
    (0, pg_core_1.uniqueIndex)('cart_items_cart_variant_uniq').on(t.cartId, t.variantId),
    (0, pg_core_1.uniqueIndex)('cart_items_cart_product_no_variant_uniq')
        .on(t.cartId, t.productId)
        .where((0, drizzle_orm_1.isNull)(t.variantId)),
]);
//# sourceMappingURL=cart-items.schema.js.map