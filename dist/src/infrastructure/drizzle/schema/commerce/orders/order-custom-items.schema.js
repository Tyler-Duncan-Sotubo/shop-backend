"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderCustomItems = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const orders_schema_1 = require("./orders.schema");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
exports.orderCustomItems = (0, pg_core_1.pgTable)('order_custom_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    orderId: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.orders.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    note: (0, pg_core_1.text)('note'),
    quantity: (0, pg_core_1.integer)('quantity').notNull().default(1),
    unitPrice: (0, pg_core_1.numeric)('unit_price', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    unitPriceMinor: (0, pg_core_1.integer)('unit_price_minor').notNull().default(0),
    lineTotal: (0, pg_core_1.numeric)('line_total', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    lineTotalMinor: (0, pg_core_1.integer)('line_total_minor').notNull().default(0),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('NGN'),
}, (t) => [
    (0, pg_core_1.index)('order_custom_items_order_idx').on(t.orderId),
    (0, pg_core_1.index)('order_custom_items_company_idx').on(t.companyId),
]);
//# sourceMappingURL=order-custom-items.schema.js.map