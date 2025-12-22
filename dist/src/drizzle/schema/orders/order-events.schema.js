"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
exports.orderEvents = (0, pg_core_1.pgTable)('order_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    orderId: (0, pg_core_1.uuid)('order_id').notNull(),
    type: (0, pg_core_1.text)('type').notNull(),
    fromStatus: (0, pg_core_1.text)('from_status'),
    toStatus: (0, pg_core_1.text)('to_status'),
    actorUserId: (0, pg_core_1.uuid)('actor_user_id'),
    ipAddress: (0, pg_core_1.text)('ip_address'),
    message: (0, pg_core_1.text)('message'),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('order_events_company_order_idx').on(t.companyId, t.orderId),
    (0, pg_core_1.index)('order_events_company_created_idx').on(t.companyId, t.createdAt),
]);
//# sourceMappingURL=order-events.schema.js.map