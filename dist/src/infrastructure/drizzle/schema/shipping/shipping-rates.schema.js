"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingRates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const shipping_enums_1 = require("./shipping.enums");
const companies_schema_1 = require("../companies/companies.schema");
const shipping_zones_schema_1 = require("./shipping-zones.schema");
const carriers_schema_1 = require("./carriers.schema");
const id_1 = require("../../id");
exports.shippingRates = (0, pg_core_1.pgTable)('shipping_rates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    zoneId: (0, pg_core_1.uuid)('zone_id')
        .notNull()
        .references(() => shipping_zones_schema_1.shippingZones.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.text)('name').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    type: (0, shipping_enums_1.shippingRateTypeEnum)('type').notNull().default('flat'),
    flatAmount: (0, pg_core_1.numeric)('flat_amount', { precision: 12, scale: 2 }),
    minOrderSubtotal: (0, pg_core_1.numeric)('min_order_subtotal', {
        precision: 12,
        scale: 2,
    }),
    maxOrderSubtotal: (0, pg_core_1.numeric)('max_order_subtotal', {
        precision: 12,
        scale: 2,
    }),
    minWeightGrams: (0, pg_core_1.integer)('min_weight_grams'),
    maxWeightGrams: (0, pg_core_1.integer)('max_weight_grams'),
    carrierId: (0, pg_core_1.uuid)('carrier_id').references(() => carriers_schema_1.carriers.id, {
        onDelete: 'set null',
    }),
    carrierServiceCode: (0, pg_core_1.varchar)('carrier_service_code', { length: 64 }),
    carrierServiceName: (0, pg_core_1.text)('carrier_service_name'),
    minDeliveryDays: (0, pg_core_1.integer)('min_delivery_days'),
    maxDeliveryDays: (0, pg_core_1.integer)('max_delivery_days'),
    priority: (0, pg_core_1.integer)('priority').notNull().default(0),
    calc: (0, shipping_enums_1.shippingRateCalcEnum)('calc').notNull().default('flat'),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('shipping_rates_company_idx').on(t.companyId),
    (0, pg_core_1.index)('shipping_rates_zone_idx').on(t.zoneId),
    (0, pg_core_1.index)('shipping_rates_company_active_idx').on(t.companyId, t.isActive),
    (0, pg_core_1.index)('shipping_rates_type_idx').on(t.type),
    (0, pg_core_1.index)('shipping_rates_priority_idx').on(t.priority),
    (0, pg_core_1.index)('shipping_rates_carrier_idx').on(t.carrierId),
    (0, pg_core_1.uniqueIndex)('shipping_rates_zone_name_uniq').on(t.zoneId, t.name),
]);
//# sourceMappingURL=shipping-rates.schema.js.map