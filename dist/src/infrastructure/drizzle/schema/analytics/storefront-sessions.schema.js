"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storefrontSessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../commerce/stores/stores.schema");
exports.storefrontSessions = (0, pg_core_1.pgTable)('storefront_sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    sessionId: (0, pg_core_1.text)('session_id').notNull(),
    firstSeenAt: (0, pg_core_1.timestamp)('first_seen_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    lastPath: (0, pg_core_1.text)('last_path'),
    referrer: (0, pg_core_1.text)('referrer'),
    cartId: (0, pg_core_1.uuid)('cart_id'),
    checkoutId: (0, pg_core_1.uuid)('checkout_id'),
    orderId: (0, pg_core_1.uuid)('order_id'),
    paymentId: (0, pg_core_1.uuid)('payment_id'),
    ipHash: (0, pg_core_1.text)('ip_hash'),
    uaHash: (0, pg_core_1.text)('ua_hash'),
    meta: (0, pg_core_1.jsonb)('meta'),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('storefront_sessions_company_session_uq').on(t.companyId, t.sessionId),
    (0, pg_core_1.index)('storefront_sessions_company_last_seen_idx').on(t.companyId, t.lastSeenAt),
    (0, pg_core_1.index)('storefront_sessions_company_store_idx').on(t.companyId, t.storeId),
]);
//# sourceMappingURL=storefront-sessions.schema.js.map