"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkouts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const shipping_zones_schema_1 = require("../shipping/shipping-zones.schema");
const shipping_rates_schema_1 = require("../shipping/shipping-rates.schema");
const inventory_locations_schema_1 = require("../inventory/inventory-locations.schema");
const pickup_locations_schema_1 = require("./pickup-locations.schema");
const carts_schema_1 = require("../cart/carts.schema");
const id_1 = require("../../id");
const stores_schema_1 = require("../stores/stores.schema");
exports.checkouts = (0, pg_core_1.pgTable)('checkouts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    cartId: (0, pg_core_1.uuid)('cart_id')
        .notNull()
        .references(() => carts_schema_1.carts.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, {
        onDelete: 'cascade',
    }),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('open'),
    channel: (0, pg_core_1.varchar)('channel', { length: 16 }).notNull().default('online'),
    currency: (0, pg_core_1.varchar)('currency', { length: 8 }).notNull().default('NGN'),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    deliveryMethodType: (0, pg_core_1.varchar)('delivery_method_type', { length: 16 })
        .notNull()
        .default('shipping'),
    shippingAddress: (0, pg_core_1.jsonb)('shipping_address').$type(),
    billingAddress: (0, pg_core_1.jsonb)('billing_address').$type(),
    pickupLocationId: (0, pg_core_1.uuid)('pickup_location_id').references(() => pickup_locations_schema_1.pickupLocations.id, { onDelete: 'set null' }),
    originInventoryLocationId: (0, pg_core_1.uuid)('origin_inventory_location_id').references(() => inventory_locations_schema_1.inventoryLocations.id, { onDelete: 'set null' }),
    shippingZoneId: (0, pg_core_1.uuid)('shipping_zone_id').references(() => shipping_zones_schema_1.shippingZones.id, {
        onDelete: 'set null',
    }),
    selectedShippingRateId: (0, pg_core_1.uuid)('selected_shipping_rate_id').references(() => shipping_rates_schema_1.shippingRates.id, { onDelete: 'set null' }),
    shippingMethodLabel: (0, pg_core_1.text)('shipping_method_label'),
    shippingQuote: (0, pg_core_1.jsonb)('shipping_quote').$type(),
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
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('checkouts_company_cart_unique').on(t.companyId, t.cartId),
    (0, pg_core_1.index)('checkouts_company_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('checkouts_company_channel_idx').on(t.companyId, t.channel),
    (0, pg_core_1.index)('checkouts_company_pickup_idx').on(t.companyId, t.pickupLocationId),
    (0, pg_core_1.index)('checkouts_company_selected_rate_idx').on(t.companyId, t.selectedShippingRateId),
]);
//# sourceMappingURL=checkouts.schema.js.map