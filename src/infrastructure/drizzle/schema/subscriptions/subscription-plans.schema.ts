// src/domains/subscriptions/schema/subscription-plans.schema.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';

export type PlanFeatures = {
  maxStores: number;
  maxTeamMembers: number;
  sms: boolean;
  emailCampaigns: boolean;
  analytics: boolean;
  analyticsRetentionDays: number;
  customDomain: boolean;
  prioritySupport: boolean;
};

export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    name: text('name').notNull(), // e.g. "Starter"
    description: text('description'), // shown in UI
    monthlyPriceNGN: integer('monthly_price_ngn').notNull().default(0),
    annualPriceNGN: integer('annual_price_ngn').notNull().default(0),
    monthlyCredits: integer('monthly_credits').notNull().default(0),

    // Feature flags — flexible jsonb so we can add features without migrations
    features: jsonb('features').$type<PlanFeatures>().notNull(),

    // Paystack plan codes — created once in Paystack dashboard
    paystackMonthlyPlanCode: text('paystack_monthly_plan_code'),
    paystackAnnualPlanCode: text('paystack_annual_plan_code'),

    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('subscription_plans_active_idx').on(t.isActive),
    index('subscription_plans_sort_idx').on(t.sortOrder),
  ],
);

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
