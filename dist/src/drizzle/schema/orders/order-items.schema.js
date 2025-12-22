"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const orders_schema_1 = require("./orders.schema");
const companies_schema_1 = require("../companies/companies.schema");
exports.orderItems = (0, pg_core_1.pgTable)('order_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'restrict' }),
    orderId: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.orders.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id'),
    variantId: (0, pg_core_1.uuid)('variant_id'),
    sku: (0, pg_core_1.varchar)('sku', { length: 64 }),
    name: (0, pg_core_1.text)('name').notNull(),
    quantity: (0, pg_core_1.integer)('quantity').notNull(),
    unitPrice: (0, pg_core_1.numeric)('unit_price', { precision: 12, scale: 2 }).notNull(),
    lineTotal: (0, pg_core_1.numeric)('line_total', { precision: 12, scale: 2 }).notNull(),
    unitPriceMinor: (0, pg_core_1.bigint)('unit_price_minor', { mode: 'number' })
        .notNull()
        .default(0),
    lineTotalMinor: (0, pg_core_1.bigint)('line_total_minor', { mode: 'number' })
        .notNull()
        .default(0),
    attributes: (0, pg_core_1.jsonb)('attributes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [(0, pg_core_1.index)('order_items_company_order_idx').on(t.companyId, t.orderId)]);
//# sourceMappingURL=order-items.schema.js.map