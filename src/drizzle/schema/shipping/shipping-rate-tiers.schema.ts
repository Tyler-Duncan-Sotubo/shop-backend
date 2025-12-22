import {
  pgTable,
  uuid,
  numeric,
  integer,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { shippingRates } from './shipping-rates.schema';
import { defaultId } from 'src/drizzle/id';

export const shippingRateTiers = pgTable(
  'shipping_rate_tiers',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    rateId: uuid('rate_id')
      .notNull()
      .references(() => shippingRates.id, { onDelete: 'cascade' }),

    // weight tiers
    minWeightGrams: integer('min_weight_grams'),
    maxWeightGrams: integer('max_weight_grams'),

    // subtotal tiers
    minSubtotal: numeric('min_subtotal', { precision: 12, scale: 2 }),
    maxSubtotal: numeric('max_subtotal', { precision: 12, scale: 2 }),

    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),

    // tie-break ordering
    priority: integer('priority').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('shipping_rate_tiers_company_idx').on(t.companyId),
    index('shipping_rate_tiers_rate_idx').on(t.rateId),
    index('shipping_rate_tiers_priority_idx').on(t.priority),
  ],
);
