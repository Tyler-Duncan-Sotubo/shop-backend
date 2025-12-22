"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingZoneLocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const shipping_zones_schema_1 = require("./shipping-zones.schema");
const id_1 = require("../../id");
exports.shippingZoneLocations = (0, pg_core_1.pgTable)('shipping_zone_locations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    zoneId: (0, pg_core_1.uuid)('zone_id')
        .notNull()
        .references(() => shipping_zones_schema_1.shippingZones.id, { onDelete: 'cascade' }),
    countryCode: (0, pg_core_1.varchar)('country_code', { length: 2 }).notNull().default('NG'),
    regionCode: (0, pg_core_1.varchar)('region_code', { length: 64 }),
    area: (0, pg_core_1.text)('area'),
    postalCodePattern: (0, pg_core_1.varchar)('postal_code_pattern', { length: 64 }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('zone_locations_company_idx').on(t.companyId),
    (0, pg_core_1.index)('zone_locations_zone_idx').on(t.zoneId),
    (0, pg_core_1.index)('zone_locations_country_idx').on(t.countryCode),
    (0, pg_core_1.index)('zone_locations_region_idx').on(t.regionCode),
    (0, pg_core_1.uniqueIndex)('zone_locations_unique').on(t.zoneId, t.countryCode, t.regionCode, t.area, t.postalCodePattern),
]);
//# sourceMappingURL=shipping-zone-locations.schema.js.map