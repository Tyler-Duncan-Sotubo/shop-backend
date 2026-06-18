"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionPlans = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
exports.subscriptionPlans = (0, pg_core_1.pgTable)('subscription_plans', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    name: (0, pg_core_1.text)('name').notNull(),
    description: (0, pg_core_1.text)('description'),
    monthlyPriceNGN: (0, pg_core_1.integer)('monthly_price_ngn').notNull().default(0),
    annualPriceNGN: (0, pg_core_1.integer)('annual_price_ngn').notNull().default(0),
    monthlyCredits: (0, pg_core_1.integer)('monthly_credits').notNull().default(0),
    features: (0, pg_core_1.jsonb)('features').$type().notNull(),
    paystackMonthlyPlanCode: (0, pg_core_1.text)('paystack_monthly_plan_code'),
    paystackAnnualPlanCode: (0, pg_core_1.text)('paystack_annual_plan_code'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
}, (t) => [
    (0, pg_core_1.index)('subscription_plans_active_idx').on(t.isActive),
    (0, pg_core_1.index)('subscription_plans_sort_idx').on(t.sortOrder),
]);
//# sourceMappingURL=subscription-plans.schema.js.map