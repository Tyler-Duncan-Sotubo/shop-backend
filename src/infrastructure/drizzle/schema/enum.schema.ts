import { pgEnum } from 'drizzle-orm/pg-core';

export const companyRoleEnum = pgEnum('company_role_enum', [
  'owner',
  'manager',
  'staff',
  'support',
]);

export const customerTypeEnum = pgEnum('customer_type', [
  'individual',
  'business',
]);

export const productStatusEnum = pgEnum('product_status', [
  'draft',
  'active',
  'archived',
]);

export const productTypeEnum = pgEnum('product_type', ['simple', 'variable']);

export const productLinkTypeEnum = pgEnum('product_link_type', [
  'related',
  'upsell',
  'cross_sell',
  'accessory',
]);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
]);

export const invoiceTypeEnum = pgEnum('invoice_type', [
  'invoice',
  'credit_note',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'bank_transfer',
  'pos',
  'cash',
  'manual',
  'gateway',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'reversed',
]);

export const allocationStatusEnum = pgEnum('allocation_status', [
  'applied',
  'reversed',
]);

export const campaignTemplateTypeEnum = pgEnum('campaign_template_type', [
  'new_arrival',
  'promotion',
  'newsletter',
]);

export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed',
]);

export const campaignAudienceTypeEnum = pgEnum('campaign_audience_type', [
  'all',
  'customers',
  'subscribers',
]);

export const campaignEventTypeEnum = pgEnum('campaign_event_type', [
  'sent',
  'opened',
  'clicked',
  'unsubscribed',
  'bounced',
  'complained',
]);

export const creditChannelEnum = pgEnum('credit_channel', ['email', 'sms']);

export const creditTransactionTypeEnum = pgEnum('credit_transaction_type', [
  'topup',
  'send',
  'refund',
  'adjustment',
]);

// ── Subscriptions ─────────────────────────────────────────────
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
]);

export const billingCycleEnum = pgEnum('billing_cycle', ['monthly', 'annual']);

export const topupStatusEnum = pgEnum('topup_status', [
  'pending',
  'paid',
  'failed',
  'refunded',
]);

export const subscriptionInvoiceTypeEnum = pgEnum('subscription_invoice_type', [
  'subscription',
  'credit_topup',
]);

export const subscriptionInvoiceStatusEnum = pgEnum(
  'subscription_invoice_status',
  ['paid', 'failed', 'refunded'],
);

// ── Types ─────────────────────────────────────────────────────
export type ProductLinkType = (typeof productLinkTypeEnum.enumValues)[number];
export type ProductType = (typeof productTypeEnum.enumValues)[number];
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type CompanyRoleName = (typeof companyRoleEnum.enumValues)[number];
export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number];
export type BillingCycle = (typeof billingCycleEnum.enumValues)[number];
export type TopupStatus = (typeof topupStatusEnum.enumValues)[number];
export type SubscriptionInvoiceType =
  (typeof subscriptionInvoiceTypeEnum.enumValues)[number];
export type SubscriptionInvoiceStatus =
  (typeof subscriptionInvoiceStatusEnum.enumValues)[number];
