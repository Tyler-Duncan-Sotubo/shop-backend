"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companySubscriptions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const subscription_plans_schema_1 = require("./subscription-plans.schema");
const companies_schema_1 = require("../companies/companies.schema");
const enum_schema_1 = require("../enum.schema");
exports.companySubscriptions = (0, pg_core_1.pgTable)('company_subscriptions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .unique()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    planId: (0, pg_core_1.uuid)('plan_id')
        .notNull()
        .references(() => subscription_plans_schema_1.subscriptionPlans.id),
    status: (0, enum_schema_1.subscriptionStatusEnum)('status').notNull().default('trialing'),
    billingCycle: (0, enum_schema_1.billingCycleEnum)('billing_cycle')
        .notNull()
        .default('monthly'),
    currentPeriodStart: (0, pg_core_1.timestamp)('current_period_start', {
        withTimezone: true,
    }),
    currentPeriodEnd: (0, pg_core_1.timestamp)('current_period_end', {
        withTimezone: true,
    }),
    trialEndsAt: (0, pg_core_1.timestamp)('trial_ends_at', { withTimezone: true }),
    cancelledAt: (0, pg_core_1.timestamp)('cancelled_at', { withTimezone: true }),
    cancelReason: (0, pg_core_1.text)('cancel_reason'),
    paystackCustomerCode: (0, pg_core_1.text)('paystack_customer_code'),
    paystackSubscriptionCode: (0, pg_core_1.text)('paystack_subscription_code'),
    paystackEmailToken: (0, pg_core_1.text)('paystack_email_token'),
}, (t) => [
    (0, pg_core_1.index)('company_subscriptions_company_idx').on(t.companyId),
    (0, pg_core_1.index)('company_subscriptions_status_idx').on(t.status),
    (0, pg_core_1.index)('company_subscriptions_plan_idx').on(t.planId),
    (0, pg_core_1.index)('company_subscriptions_period_end_idx').on(t.currentPeriodEnd),
]);
//# sourceMappingURL=company-subscriptions.schema.js.map