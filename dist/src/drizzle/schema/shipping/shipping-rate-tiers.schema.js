"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingRateTiers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const shipping_rates_schema_1 = require("./shipping-rates.schema");
const id_1 = require("../../id");
exports.shippingRateTiers = (0, pg_core_1.pgTable)('shipping_rate_tiers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    rateId: (0, pg_core_1.uuid)('rate_id')
        .notNull()
        .references(() => shipping_rates_schema_1.shippingRates.id, { onDelete: 'cascade' }),
    minWeightGrams: (0, pg_core_1.integer)('min_weight_grams'),
    maxWeightGrams: (0, pg_core_1.integer)('max_weight_grams'),
    minSubtotal: (0, pg_core_1.numeric)('min_subtotal', { precision: 12, scale: 2 }),
    maxSubtotal: (0, pg_core_1.numeric)('max_subtotal', { precision: 12, scale: 2 }),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    priority: (0, pg_core_1.integer)('priority').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('shipping_rate_tiers_company_idx').on(t.companyId),
    (0, pg_core_1.index)('shipping_rate_tiers_rate_idx').on(t.rateId),
    (0, pg_core_1.index)('shipping_rate_tiers_priority_idx').on(t.priority),
]);
//# sourceMappingURL=shipping-rate-tiers.schema.js.map