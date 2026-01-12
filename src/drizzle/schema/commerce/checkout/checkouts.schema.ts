import {
  pgTable,
  uuid,
  varchar,
  numeric,
  jsonb,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { shippingZones } from '../../shipping/shipping-zones.schema';
import { shippingRates } from '../../shipping/shipping-rates.schema';
import { inventoryLocations } from '../inventory/inventory-locations.schema';
import { pickupLocations } from './pickup-locations.schema';
import { carts } from '../cart/carts.schema';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../stores/stores.schema';

export const checkouts = pgTable(
  'checkouts',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    cartId: uuid('cart_id')
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, {
        onDelete: 'cascade',
      }),

    status: varchar('status', { length: 32 }).notNull().default('open'),
    // open | locked | completed | expired | cancelled

    channel: varchar('channel', { length: 16 }).notNull().default('online'),
    currency: varchar('currency', { length: 8 }).notNull().default('NGN'),

    email: varchar('email', { length: 255 }),

    deliveryMethodType: varchar('delivery_method_type', { length: 16 })
      .notNull()
      .default('shipping'),
    // shipping | pickup

    shippingAddress: jsonb('shipping_address').$type<Record<string, any>>(),
    billingAddress: jsonb('billing_address').$type<Record<string, any>>(),

    pickupLocationId: uuid('pickup_location_id').references(
      () => pickupLocations.id,
      { onDelete: 'set null' },
    ),

    originInventoryLocationId: uuid('origin_inventory_location_id').references(
      () => inventoryLocations.id,
      { onDelete: 'set null' },
    ),

    shippingZoneId: uuid('shipping_zone_id').references(
      () => shippingZones.id,
      {
        onDelete: 'set null',
      },
    ),

    selectedShippingRateId: uuid('selected_shipping_rate_id').references(
      () => shippingRates.id,
      { onDelete: 'set null' },
    ),

    shippingMethodLabel: text('shipping_method_label'),

    shippingQuote: jsonb('shipping_quote').$type<{
      countryCode?: string;
      state?: string | null;
      area?: string | null;
      totalWeightGrams?: number;
      calc?: 'flat' | 'weight';
      tierId?: string | null;
      carrierId?: string | null;
      rateId?: string | null;
      zoneId?: string | null;
      computedAt?: string;
      rateSnapshot?: {
        name?: string;
        minDeliveryDays?: number | null;
        maxDeliveryDays?: number | null;
      };
    }>(),

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

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    metadata: jsonb('metadata').$type<Record<string, any>>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('checkouts_company_cart_unique').on(t.companyId, t.cartId),
    index('checkouts_company_status_idx').on(t.companyId, t.status),
    index('checkouts_company_channel_idx').on(t.companyId, t.channel),
    index('checkouts_company_pickup_idx').on(t.companyId, t.pickupLocationId),
    index('checkouts_company_selected_rate_idx').on(
      t.companyId,
      t.selectedShippingRateId,
    ),
  ],
);
