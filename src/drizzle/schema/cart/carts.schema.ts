import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  text,
  jsonb,
  index,
  uniqueIndex,
  integer,
} from 'drizzle-orm/pg-core';
import { cartStatusEnum, cartOwnerTypeEnum, cartChannel } from './cart.enums';
import { companies } from '../companies/companies.schema';
import { customers } from '../customers/customers.schema';
import { shippingRates } from '../shipping/shipping-rates.schema';
import { inventoryLocations } from '../inventory/inventory-locations.schema';
import { orders } from '../orders/orders.schema';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../stores/stores.schema';

export const carts = pgTable(
  'carts',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    cartId: integer('cart_id').generatedAlwaysAsIdentity(),
    // multi-tenant boundary; also used by your versioned cache
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, {
        onDelete: 'cascade',
      }),

    // who owns this cart
    ownerType: cartOwnerTypeEnum('owner_type').notNull().default('guest'),

    // if ownerType=customer, this links the cart to a customer
    customerId: uuid('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),

    // if ownerType=guest, you bind the cart to a session token
    guestToken: varchar('guest_token', { length: 255 }),
    guestRefreshTokenHash: varchar('guest_refresh_token_hash', { length: 255 }),
    guestRefreshTokenExpiresAt: timestamp('guest_refresh_token_expires_at', {
      withTimezone: true,
    }),

    status: cartStatusEnum('status').notNull().default('active'),

    currency: varchar('currency', { length: 3 }).notNull().default('GBP'),

    // totals snapshots (persist output of totals engine)
    subtotal: numeric('subtotal', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    discountTotal: numeric('discount_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    taxTotal: numeric('tax_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    shippingTotal: numeric('shipping_total', { precision: 12, scale: 2 })
      .notNull()
      .default('0'),
    total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),

    // optional: breakdown of how totals were calculated (rules, promotions, etc.)
    totalsBreakdown: jsonb('totals_breakdown').$type<Record<string, any>>(),

    // optional: which shipping rate the user selected
    selectedShippingRateId: uuid('selected_shipping_rate_id').references(
      () => shippingRates.id,
      { onDelete: 'set null' },
    ),
    selectedShippingMethodLabel: text('selected_shipping_method_label'),

    // expiration support (background job can expire carts where expiresAt < now)
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    // optional: if you want to attach a shipping origin at cart level
    originInventoryLocationId: uuid('origin_inventory_location_id').references(
      () => inventoryLocations.id,
      {
        onDelete: 'set null',
      },
    ),

    channel: cartChannel('channel').notNull().default('online'),

    fulfillmentMode: text('fulfillment_mode')
      .notNull()
      .default('single_location'),

    fulfillmentBreakdown: jsonb('fulfillment_breakdown').$type<{
      originInventoryLocationId?: string | null;
      mode: 'pos_location' | 'single_location' | 'split';
    }>(),

    metadata: jsonb('metadata').$type<Record<string, any>>(),

    convertedOrderId: uuid('converted_order_id').references(() => orders.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('carts_company_idx').on(t.companyId),
    index('carts_company_status_idx').on(t.companyId, t.status),
    index('carts_expires_idx').on(t.companyId, t.expiresAt),
    index('carts_customer_idx').on(t.customerId),
    uniqueIndex('carts_guest_token_uniq').on(t.companyId, t.guestToken),

    // added
    index('carts_origin_location_idx').on(
      t.companyId,
      t.originInventoryLocationId,
    ),
    index('carts_selected_shipping_rate_idx').on(
      t.companyId,
      t.selectedShippingRateId,
    ),
    index('carts_fulfillment_mode_idx').on(t.companyId, t.fulfillmentMode),
    index('carts_converted_order_idx').on(t.companyId, t.convertedOrderId),
  ],
);
