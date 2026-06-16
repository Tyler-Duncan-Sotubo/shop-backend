"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditTransactionTypeEnum = exports.creditChannelEnum = exports.campaignEventTypeEnum = exports.campaignAudienceTypeEnum = exports.campaignStatusEnum = exports.campaignTemplateTypeEnum = exports.allocationStatusEnum = exports.paymentStatusEnum = exports.paymentMethodEnum = exports.invoiceTypeEnum = exports.invoiceStatusEnum = exports.productLinkTypeEnum = exports.productTypeEnum = exports.productStatusEnum = exports.customerTypeEnum = exports.companyRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.companyRoleEnum = (0, pg_core_1.pgEnum)('company_role_enum', [
    'owner',
    'manager',
    'staff',
    'support',
]);
exports.customerTypeEnum = (0, pg_core_1.pgEnum)('customer_type', [
    'individual',
    'business',
]);
exports.productStatusEnum = (0, pg_core_1.pgEnum)('product_status', [
    'draft',
    'active',
    'archived',
]);
exports.productTypeEnum = (0, pg_core_1.pgEnum)('product_type', ['simple', 'variable']);
exports.productLinkTypeEnum = (0, pg_core_1.pgEnum)('product_link_type', [
    'related',
    'upsell',
    'cross_sell',
    'accessory',
]);
exports.invoiceStatusEnum = (0, pg_core_1.pgEnum)('invoice_status', [
    'draft',
    'issued',
    'partially_paid',
    'paid',
    'void',
]);
exports.invoiceTypeEnum = (0, pg_core_1.pgEnum)('invoice_type', [
    'invoice',
    'credit_note',
]);
exports.paymentMethodEnum = (0, pg_core_1.pgEnum)('payment_method', [
    'bank_transfer',
    'pos',
    'cash',
    'manual',
    'gateway',
]);
exports.paymentStatusEnum = (0, pg_core_1.pgEnum)('payment_status', [
    'pending',
    'succeeded',
    'reversed',
]);
exports.allocationStatusEnum = (0, pg_core_1.pgEnum)('allocation_status', [
    'applied',
    'reversed',
]);
exports.campaignTemplateTypeEnum = (0, pg_core_1.pgEnum)('campaign_template_type', [
    'new_arrival',
    'promotion',
    'newsletter',
]);
exports.campaignStatusEnum = (0, pg_core_1.pgEnum)('campaign_status', [
    'draft',
    'scheduled',
    'sending',
    'sent',
    'failed',
]);
exports.campaignAudienceTypeEnum = (0, pg_core_1.pgEnum)('campaign_audience_type', [
    'all',
    'customers',
    'subscribers',
]);
exports.campaignEventTypeEnum = (0, pg_core_1.pgEnum)('campaign_event_type', [
    'sent',
    'opened',
    'clicked',
    'unsubscribed',
    'bounced',
    'complained',
]);
exports.creditChannelEnum = (0, pg_core_1.pgEnum)('credit_channel', ['email', 'sms']);
exports.creditTransactionTypeEnum = (0, pg_core_1.pgEnum)('credit_transaction_type', [
    'topup',
    'send',
    'refund',
    'adjustment',
]);
//# sourceMappingURL=enum.schema.js.map