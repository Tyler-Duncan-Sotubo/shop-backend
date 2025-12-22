"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryReservations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
exports.inventoryReservations = (0, pg_core_1.pgTable)('inventory_reservations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    orderId: (0, pg_core_1.uuid)('order_id').notNull(),
    locationId: (0, pg_core_1.uuid)('location_id').notNull(),
    productVariantId: (0, pg_core_1.uuid)('product_variant_id').notNull(),
    quantity: (0, pg_core_1.integer)('quantity').notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 16 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('reservation_order_idx').on(t.companyId, t.orderId),
    (0, pg_core_1.index)('reservation_variant_idx').on(t.companyId, t.locationId, t.productVariantId),
    (0, pg_core_1.uniqueIndex)('reservation_unique').on(t.companyId, t.orderId, t.locationId, t.productVariantId),
]);
//# sourceMappingURL=inventory-reservations.schema.js.map