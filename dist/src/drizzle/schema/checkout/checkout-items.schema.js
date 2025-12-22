"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkoutItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const checkouts_schema_1 = require("./checkouts.schema");
const products_schema_1 = require("../catalogs/products.schema");
const variants_schema_1 = require("../catalogs/variants.schema");
const id_1 = require("../../id");
exports.checkoutItems = (0, pg_core_1.pgTable)('checkout_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    checkoutId: (0, pg_core_1.uuid)('checkout_id')
        .notNull()
        .references(() => checkouts_schema_1.checkouts.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id').references(() => products_schema_1.products.id, {
        onDelete: 'set null',
    }),
    variantId: (0, pg_core_1.uuid)('variant_id').references(() => variants_schema_1.productVariants.id, {
        onDelete: 'set null',
    }),
    sku: (0, pg_core_1.varchar)('sku', { length: 64 }),
    name: (0, pg_core_1.text)('name').notNull(),
    quantity: (0, pg_core_1.integer)('quantity').notNull(),
    unitPrice: (0, pg_core_1.numeric)('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineTotal: (0, pg_core_1.numeric)('line_total', { precision: 12, scale: 2 }).notNull(),
    attributes: (0, pg_core_1.jsonb)('attributes').$type(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('checkout_items_company_checkout_idx').on(t.companyId, t.checkoutId),
]);
//# sourceMappingURL=checkout-items.schema.js.map