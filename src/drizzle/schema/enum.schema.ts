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

// enum.schema.ts
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
  'gateway', // for Paystack/Stripe later
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

export type ProductLinkType = (typeof productLinkTypeEnum.enumValues)[number];
export type ProductType = (typeof productTypeEnum.enumValues)[number];
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type CompanyRoleName = (typeof companyRoleEnum.enumValues)[number];
