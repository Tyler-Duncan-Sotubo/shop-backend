"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocationStatusEnum = exports.paymentStatusEnum = exports.paymentMethodEnum = exports.invoiceTypeEnum = exports.invoiceStatusEnum = exports.productLinkTypeEnum = exports.productTypeEnum = exports.productStatusEnum = exports.customerTypeEnum = exports.companyRoleEnum = void 0;
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
//# sourceMappingURL=enum.schema.js.map