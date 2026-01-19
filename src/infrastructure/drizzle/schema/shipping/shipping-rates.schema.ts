import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  integer,
  varchar,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { shippingRateCalcEnum, shippingRateTypeEnum } from './shipping.enums';
import { companies } from '../companies/companies.schema';
import { shippingZones } from './shipping-zones.schema';
import { carriers } from './carriers.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const shippingRates = pgTable(
  'shipping_rates',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    isDefault: boolean('is_default').notNull().default(false),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    zoneId: uuid('zone_id')
      .notNull()
      .references(() => shippingZones.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // "Lagos Standard", "Nationwide"
    isActive: boolean('is_active').notNull().default(true),

    type: shippingRateTypeEnum('type').notNull().default('flat'),

    // flat pricing (Nigeria common)
    flatAmount: numeric('flat_amount', { precision: 12, scale: 2 }),

    // applicability constraints (optional)
    minOrderSubtotal: numeric('min_order_subtotal', {
      precision: 12,
      scale: 2,
    }),
    maxOrderSubtotal: numeric('max_order_subtotal', {
      precision: 12,
      scale: 2,
    }),
    minWeightGrams: integer('min_weight_grams'),
    maxWeightGrams: integer('max_weight_grams'),

    // optional carrier linkage (Nigeria now or later)
    carrierId: uuid('carrier_id').references(() => carriers.id, {
      onDelete: 'set null',
    }),

    carrierServiceCode: varchar('carrier_service_code', { length: 64 }),
    carrierServiceName: text('carrier_service_name'),

    // display
    minDeliveryDays: integer('min_delivery_days'),
    maxDeliveryDays: integer('max_delivery_days'),

    // ordering on checkout
    priority: integer('priority').notNull().default(0),
    calc: shippingRateCalcEnum('calc').notNull().default('flat'),

    metadata: jsonb('metadata').$type<Record<string, any>>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('shipping_rates_company_idx').on(t.companyId),
    index('shipping_rates_zone_idx').on(t.zoneId),
    index('shipping_rates_company_active_idx').on(t.companyId, t.isActive),
    index('shipping_rates_type_idx').on(t.type),
    index('shipping_rates_priority_idx').on(t.priority),
    index('shipping_rates_carrier_idx').on(t.carrierId),
    uniqueIndex('shipping_rates_zone_name_uniq').on(t.zoneId, t.name),
  ],
);
