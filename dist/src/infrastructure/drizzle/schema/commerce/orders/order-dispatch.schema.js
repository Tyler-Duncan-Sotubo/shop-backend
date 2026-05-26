"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderDispatches = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const orders_schema_1 = require("./orders.schema");
exports.orderDispatches = (0, pg_core_1.pgTable)('order_dispatches', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    orderId: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.orders.id, { onDelete: 'cascade' }),
    status: (0, pg_core_1.varchar)('status', { length: 32 })
        .notNull()
        .default('pending')
        .$type(),
    requestedByUserId: (0, pg_core_1.uuid)('requested_by_user_id'),
    confirmedByUserId: (0, pg_core_1.uuid)('confirmed_by_user_id'),
    note: (0, pg_core_1.text)('note'),
    dispatchedAt: (0, pg_core_1.timestamp)('dispatched_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('order_dispatches_company_idx').on(t.companyId),
    (0, pg_core_1.index)('order_dispatches_order_idx').on(t.companyId, t.orderId),
    (0, pg_core_1.index)('order_dispatches_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('order_dispatches_store_status_idx').on(t.companyId, t.storeId, t.status),
]);
//# sourceMappingURL=order-dispatch.schema.js.map