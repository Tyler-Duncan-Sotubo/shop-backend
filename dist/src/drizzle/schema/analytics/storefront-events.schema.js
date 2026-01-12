"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storefrontEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../commerce/stores/stores.schema");
exports.storefrontEvents = (0, pg_core_1.pgTable)('storefront_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    sessionId: (0, pg_core_1.text)('session_id').notNull(),
    event: (0, pg_core_1.text)('event').notNull(),
    path: (0, pg_core_1.text)('path'),
    referrer: (0, pg_core_1.text)('referrer'),
    title: (0, pg_core_1.text)('title'),
    cartId: (0, pg_core_1.uuid)('cart_id'),
    checkoutId: (0, pg_core_1.uuid)('checkout_id'),
    orderId: (0, pg_core_1.uuid)('order_id'),
    paymentId: (0, pg_core_1.uuid)('payment_id'),
    ts: (0, pg_core_1.timestamp)('ts', { withTimezone: true }).defaultNow().notNull(),
    meta: (0, pg_core_1.jsonb)('meta'),
}, (t) => [
    (0, pg_core_1.index)('storefront_events_company_ts_idx').on(t.companyId, t.ts),
    (0, pg_core_1.index)('storefront_events_company_event_idx').on(t.companyId, t.event),
    (0, pg_core_1.index)('storefront_events_company_session_idx').on(t.companyId, t.sessionId),
]);
//# sourceMappingURL=storefront-events.schema.js.map