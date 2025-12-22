import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { shippingZones } from './shipping-zones.schema';
import { defaultId } from 'src/drizzle/id';

export const shippingZoneLocations = pgTable(
  'shipping_zone_locations',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    zoneId: uuid('zone_id')
      .notNull()
      .references(() => shippingZones.id, { onDelete: 'cascade' }),

    // Nigeria first: "NG". Later: "GH", "KE", etc.
    countryCode: varchar('country_code', { length: 2 }).notNull().default('NG'),

    // Nigeria now: State (e.g. "Lagos", "FCT", "Rivers"). Later: state/province/subdivision.
    regionCode: varchar('region_code', { length: 64 }),

    // Nigeria now/later: LGA / city / district (free text for flexibility)
    area: text('area'),

    // optional pattern if you use postcodes (regex/like pattern by your matcher)
    postalCodePattern: varchar('postal_code_pattern', { length: 64 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('zone_locations_company_idx').on(t.companyId),
    index('zone_locations_zone_idx').on(t.zoneId),
    index('zone_locations_country_idx').on(t.countryCode),
    index('zone_locations_region_idx').on(t.regionCode),
    uniqueIndex('zone_locations_unique').on(
      t.zoneId,
      t.countryCode,
      t.regionCode,
      t.area,
      t.postalCodePattern,
    ),
  ],
);
