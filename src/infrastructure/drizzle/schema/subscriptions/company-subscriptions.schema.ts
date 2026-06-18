// src/domains/subscriptions/schema/company-subscriptions.schema.ts
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { subscriptionPlans } from './subscription-plans.schema';
import { companies } from '../companies/companies.schema';
import { subscriptionStatusEnum, billingCycleEnum } from '../enum.schema';

export const companySubscriptions = pgTable(
  'company_subscriptions',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .unique() // one active sub per company
      .references(() => companies.id, { onDelete: 'cascade' }),

    planId: uuid('plan_id')
      .notNull()
      .references(() => subscriptionPlans.id),

    status: subscriptionStatusEnum('status').notNull().default('trialing'),

    billingCycle: billingCycleEnum('billing_cycle')
      .notNull()
      .default('monthly'),

    // Current billing period
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', {
      withTimezone: true,
    }),

    // Trial
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),

    // Cancellation
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),

    // Paystack references
    paystackCustomerCode: text('paystack_customer_code'),
    paystackSubscriptionCode: text('paystack_subscription_code'),
    paystackEmailToken: text('paystack_email_token'), // for managing sub via Paystack
  },
  (t) => [
    index('company_subscriptions_company_idx').on(t.companyId),
    index('company_subscriptions_status_idx').on(t.status),
    index('company_subscriptions_plan_idx').on(t.planId),
    index('company_subscriptions_period_end_idx').on(t.currentPeriodEnd),
  ],
);

export type CompanySubscription = typeof companySubscriptions.$inferSelect;
export type NewCompanySubscription = typeof companySubscriptions.$inferInsert;
