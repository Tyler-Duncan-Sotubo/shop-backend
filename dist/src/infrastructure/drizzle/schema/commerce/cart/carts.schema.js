"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const cart_enums_1 = require("./cart.enums");
const companies_schema_1 = require("../../companies/companies.schema");
const customers_schema_1 = require("../../customers/customers.schema");
const shipping_rates_schema_1 = require("../../shipping/shipping-rates.schema");
const inventory_locations_schema_1 = require("../inventory/inventory-locations.schema");
const orders_schema_1 = require("../orders/orders.schema");
const id_1 = require("../../../id");
const stores_schema_1 = require("../stores/stores.schema");
exports.carts = (0, pg_core_1.pgTable)('carts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    cartId: (0, pg_core_1.integer)('cart_id').generatedAlwaysAsIdentity(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, {
        onDelete: 'cascade',
    }),
    ownerType: (0, cart_enums_1.cartOwnerTypeEnum)('owner_type').notNull().default('guest'),
    customerId: (0, pg_core_1.uuid)('customer_id').references(() => customers_schema_1.customers.id, {
        onDelete: 'set null',
    }),
    guestToken: (0, pg_core_1.varchar)('guest_token', { length: 255 }),
    guestRefreshTokenHash: (0, pg_core_1.varchar)('guest_refresh_token_hash', { length: 255 }),
    guestRefreshTokenExpiresAt: (0, pg_core_1.timestamp)('guest_refresh_token_expires_at', {
        withTimezone: true,
    }),
    status: (0, cart_enums_1.cartStatusEnum)('status').notNull().default('active'),
    currency: (0, pg_core_1.varchar)('currency', { length: 3 }).notNull().default('GBP'),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    discountTotal: (0, pg_core_1.numeric)('discount_total', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    taxTotal: (0, pg_core_1.numeric)('tax_total', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    shippingTotal: (0, pg_core_1.numeric)('shipping_total', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 12, scale: 2 }).notNull().default('0'),
    totalsBreakdown: (0, pg_core_1.jsonb)('totals_breakdown').$type(),
    selectedShippingRateId: (0, pg_core_1.uuid)('selected_shipping_rate_id').references(() => shipping_rates_schema_1.shippingRates.id, { onDelete: 'set null' }),
    selectedShippingMethodLabel: (0, pg_core_1.text)('selected_shipping_method_label'),
    lastActivityAt: (0, pg_core_1.timestamp)('last_activity_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    originInventoryLocationId: (0, pg_core_1.uuid)('origin_inventory_location_id').references(() => inventory_locations_schema_1.inventoryLocations.id, {
        onDelete: 'set null',
    }),
    channel: (0, cart_enums_1.cartChannel)('channel').notNull().default('online'),
    fulfillmentMode: (0, pg_core_1.text)('fulfillment_mode')
        .notNull()
        .default('single_location'),
    fulfillmentBreakdown: (0, pg_core_1.jsonb)('fulfillment_breakdown').$type(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    convertedOrderId: (0, pg_core_1.uuid)('converted_order_id').references(() => orders_schema_1.orders.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('carts_company_idx').on(t.companyId),
    (0, pg_core_1.index)('carts_company_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('carts_expires_idx').on(t.companyId, t.expiresAt),
    (0, pg_core_1.index)('carts_customer_idx').on(t.customerId),
    (0, pg_core_1.uniqueIndex)('carts_guest_token_uniq').on(t.companyId, t.guestToken),
    (0, pg_core_1.index)('carts_origin_location_idx').on(t.companyId, t.originInventoryLocationId),
    (0, pg_core_1.index)('carts_selected_shipping_rate_idx').on(t.companyId, t.selectedShippingRateId),
    (0, pg_core_1.index)('carts_fulfillment_mode_idx').on(t.companyId, t.fulfillmentMode),
    (0, pg_core_1.index)('carts_converted_order_idx').on(t.companyId, t.convertedOrderId),
]);
//# sourceMappingURL=carts.schema.js.map