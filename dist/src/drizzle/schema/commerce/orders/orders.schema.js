"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderCounters = exports.orders = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const pickup_locations_schema_1 = require("../checkout/pickup-locations.schema");
const shipping_zones_schema_1 = require("../../shipping/shipping-zones.schema");
const shipping_rates_schema_1 = require("../../shipping/shipping-rates.schema");
const inventory_locations_schema_1 = require("../inventory/inventory-locations.schema");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const checkouts_schema_1 = require("../checkout/checkouts.schema");
const carts_schema_1 = require("../cart/carts.schema");
const quote_requests_schema_1 = require("../quotes/quote-requests.schema");
exports.orders = (0, pg_core_1.pgTable)('orders', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    orderNumber: (0, pg_core_1.varchar)('order_number', { length: 32 }).notNull(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    checkoutId: (0, pg_core_1.uuid)('checkout_id').references(() => checkouts_schema_1.checkouts.id, {
        onDelete: 'cascade',
    }),
    quoteRequestId: (0, pg_core_1.uuid)('quote_request_id').references(() => quote_requests_schema_1.quoteRequests.id, {
        onDelete: 'set null',
    }),
    cartId: (0, pg_core_1.uuid)('cart_id').references(() => carts_schema_1.carts.id, { onDelete: 'cascade' }),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull(),
    channel: (0, pg_core_1.varchar)('channel', { length: 16 }).notNull(),
    currency: (0, pg_core_1.varchar)('currency', { length: 8 }).notNull(),
    customerId: (0, pg_core_1.uuid)('customer_id'),
    deliveryMethodType: (0, pg_core_1.varchar)('delivery_method_type', { length: 16 })
        .notNull()
        .default('shipping'),
    pickupLocationId: (0, pg_core_1.uuid)('pickup_location_id').references(() => pickup_locations_schema_1.pickupLocations.id, { onDelete: 'set null' }),
    shippingZoneId: (0, pg_core_1.uuid)('shipping_zone_id').references(() => shipping_zones_schema_1.shippingZones.id, { onDelete: 'set null' }),
    selectedShippingRateId: (0, pg_core_1.uuid)('selected_shipping_rate_id').references(() => shipping_rates_schema_1.shippingRates.id, { onDelete: 'set null' }),
    shippingMethodLabel: (0, pg_core_1.text)('shipping_method_label'),
    shippingAddress: (0, pg_core_1.jsonb)('shipping_address').$type(),
    billingAddress: (0, pg_core_1.jsonb)('billing_address').$type(),
    originInventoryLocationId: (0, pg_core_1.uuid)('origin_inventory_location_id').references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'set null' }),
    shippingQuote: (0, pg_core_1.jsonb)('shipping_quote').$type(),
    paidAt: (0, pg_core_1.timestamp)('paid_at', { withTimezone: true }),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountTotal: (0, pg_core_1.numeric)('discount_total', {
        precision: 12,
        scale: 2,
    }).notNull(),
    taxTotal: (0, pg_core_1.numeric)('tax_total', { precision: 12, scale: 2 }).notNull(),
    shippingTotal: (0, pg_core_1.numeric)('shipping_total', {
        precision: 12,
        scale: 2,
    }).notNull(),
    total: (0, pg_core_1.numeric)('total', { precision: 12, scale: 2 }).notNull(),
    subtotalMinor: (0, pg_core_1.bigint)('subtotal_minor', { mode: 'number' })
        .notNull()
        .default(0),
    discountTotalMinor: (0, pg_core_1.bigint)('discount_total_minor', { mode: 'number' })
        .notNull()
        .default(0),
    taxTotalMinor: (0, pg_core_1.bigint)('tax_total_minor', { mode: 'number' })
        .notNull()
        .default(0),
    shippingTotalMinor: (0, pg_core_1.bigint)('shipping_total_minor', { mode: 'number' })
        .notNull()
        .default(0),
    totalMinor: (0, pg_core_1.bigint)('total_minor', { mode: 'number' }).notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('order_number_unique').on(t.companyId, t.orderNumber),
    (0, pg_core_1.uniqueIndex)('orders_company_cart_unique').on(t.companyId, t.cartId),
    (0, pg_core_1.uniqueIndex)('orders_company_checkout_unique').on(t.companyId, t.checkoutId),
    (0, pg_core_1.index)('orders_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('orders_delivery_idx').on(t.companyId, t.deliveryMethodType),
    (0, pg_core_1.index)('orders_pickup_idx').on(t.companyId, t.pickupLocationId),
    (0, pg_core_1.index)('orders_company_created_idx').on(t.companyId, t.createdAt),
    (0, pg_core_1.index)('orders_company_store_created_idx').on(t.companyId, t.storeId, t.createdAt),
    (0, pg_core_1.index)('orders_company_status_created_idx').on(t.companyId, t.status, t.createdAt),
]);
exports.orderCounters = (0, pg_core_1.pgTable)('order_counters', {
    id: (0, pg_core_1.uuid)('id').primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    nextNumber: (0, pg_core_1.integer)('next_number').notNull().default(1),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [(0, pg_core_1.uniqueIndex)('order_counters_company_unique').on(t.companyId)]);
//# sourceMappingURL=orders.schema.js.map