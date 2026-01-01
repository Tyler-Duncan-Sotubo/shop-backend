import {
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  text,
  integer,
  bigint,
} from 'drizzle-orm/pg-core';
import { pickupLocations } from '../checkout/pickup-locations.schema';
import { shippingZones } from '../shipping/shipping-zones.schema';
import { shippingRates } from '../shipping/shipping-rates.schema';
import { inventoryLocations } from '../inventory/inventory-locations.schema';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../companies/companies.schema';
import { stores } from '../stores/stores.schema';
import { checkouts } from '../checkout/checkouts.schema';
import { carts } from '../cart/carts.schema';
import { quoteRequests } from '../quotes/quote-requests.schema';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    orderNumber: varchar('order_number', { length: 32 }).notNull(),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    checkoutId: uuid('checkout_id').references(() => checkouts.id, {
      onDelete: 'cascade',
    }),

    quoteRequestId: uuid('quote_request_id').references(
      () => quoteRequests.id,
      {
        onDelete: 'set null',
      },
    ),

    cartId: uuid('cart_id').references(() => carts.id, { onDelete: 'cascade' }),

    status: varchar('status', { length: 32 }).notNull(),
    channel: varchar('channel', { length: 16 }).notNull(),
    currency: varchar('currency', { length: 8 }).notNull(),

    customerId: uuid('customer_id'),

    deliveryMethodType: varchar('delivery_method_type', { length: 16 })
      .notNull()
      .default('shipping'),

    pickupLocationId: uuid('pickup_location_id').references(
      () => pickupLocations.id,
      { onDelete: 'set null' },
    ),

    shippingZoneId: uuid('shipping_zone_id').references(
      () => shippingZones.id,
      { onDelete: 'set null' },
    ),

    selectedShippingRateId: uuid('selected_shipping_rate_id').references(
      () => shippingRates.id,
      { onDelete: 'set null' },
    ),

    shippingMethodLabel: text('shipping_method_label'),

    shippingAddress: jsonb('shipping_address').$type<Record<string, any>>(),
    billingAddress: jsonb('billing_address').$type<Record<string, any>>(),

    originInventoryLocationId: uuid('origin_inventory_location_id').references(
      () => inventoryLocations.id,
      { onDelete: 'set null' },
    ),

    shippingQuote: jsonb('shipping_quote').$type<Record<string, any>>(),

    paidAt: timestamp('paid_at', { withTimezone: true }),

    // -----------------------------
    // Existing (major units) - keep for now
    // -----------------------------
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountTotal: numeric('discount_total', {
      precision: 12,
      scale: 2,
    }).notNull(),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 }).notNull(),
    shippingTotal: numeric('shipping_total', {
      precision: 12,
      scale: 2,
    }).notNull(),
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),

    // -----------------------------
    // ✅ NEW: minor units (authoritative for billing/invoicing)
    // -----------------------------
    subtotalMinor: bigint('subtotal_minor', { mode: 'number' })
      .notNull()
      .default(0),
    discountTotalMinor: bigint('discount_total_minor', { mode: 'number' })
      .notNull()
      .default(0),
    taxTotalMinor: bigint('tax_total_minor', { mode: 'number' })
      .notNull()
      .default(0),
    shippingTotalMinor: bigint('shipping_total_minor', { mode: 'number' })
      .notNull()
      .default(0),
    totalMinor: bigint('total_minor', { mode: 'number' }).notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('order_number_unique').on(t.companyId, t.orderNumber),

    uniqueIndex('orders_company_cart_unique').on(t.companyId, t.cartId),
    uniqueIndex('orders_company_checkout_unique').on(t.companyId, t.checkoutId),

    index('orders_status_idx').on(t.companyId, t.status),
    index('orders_delivery_idx').on(t.companyId, t.deliveryMethodType),
    index('orders_pickup_idx').on(t.companyId, t.pickupLocationId),

    // ✅ helpful for finance/reporting and billing pipelines
    index('orders_company_created_idx').on(t.companyId, t.createdAt),
    index('orders_company_store_created_idx').on(
      t.companyId,
      t.storeId,
      t.createdAt,
    ),
    index('orders_company_status_created_idx').on(
      t.companyId,
      t.status,
      t.createdAt,
    ),
  ],
);

export const orderCounters = pgTable(
  'order_counters',
  {
    id: uuid('id').primaryKey(),
    companyId: uuid('company_id').notNull(),
    nextNumber: integer('next_number').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex('order_counters_company_unique').on(t.companyId)],
);
