"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptCounters = exports.paymentReceipts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const payments_schema_1 = require("./payments.schema");
const invoices_schema_1 = require("../invoice/invoices.schema");
const orders_schema_1 = require("../../orders/orders.schema");
const enum_schema_1 = require("../../enum.schema");
exports.paymentReceipts = (0, pg_core_1.pgTable)('payment_receipts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    paymentId: (0, pg_core_1.uuid)('payment_id')
        .notNull()
        .references(() => payments_schema_1.payments.id, { onDelete: 'cascade' }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id').references(() => invoices_schema_1.invoices.id, {
        onDelete: 'set null',
    }),
    orderId: (0, pg_core_1.uuid)('order_id').references(() => orders_schema_1.orders.id, {
        onDelete: 'set null',
    }),
    invoiceNumber: (0, pg_core_1.text)('invoice_number'),
    orderNumber: (0, pg_core_1.text)('order_number'),
    sequenceNumber: (0, pg_core_1.integer)('sequence_number').notNull(),
    receiptNumber: (0, pg_core_1.text)('receipt_number').notNull(),
    currency: (0, pg_core_1.text)('currency').notNull(),
    amountMinor: (0, pg_core_1.bigint)('amount_minor', { mode: 'number' }).notNull(),
    method: (0, enum_schema_1.paymentMethodEnum)('method').notNull(),
    reference: (0, pg_core_1.text)('reference'),
    customerSnapshot: (0, pg_core_1.jsonb)('customer_snapshot'),
    storeSnapshot: (0, pg_core_1.jsonb)('store_snapshot'),
    meta: (0, pg_core_1.jsonb)('meta'),
    issuedAt: (0, pg_core_1.timestamp)('issued_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('payment_receipts_company_payment_uq').on(t.companyId, t.paymentId),
    (0, pg_core_1.uniqueIndex)('payment_receipts_company_receipt_number_uq').on(t.companyId, t.receiptNumber),
    (0, pg_core_1.index)('payment_receipts_company_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.index)('payment_receipts_company_order_idx').on(t.companyId, t.orderId),
]);
exports.receiptCounters = (0, pg_core_1.pgTable)('receipt_counters', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    nextNumber: (0, pg_core_1.integer)('next_number').notNull().default(1),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [(0, pg_core_1.uniqueIndex)('receipt_counters_company_uq').on(t.companyId)]);
//# sourceMappingURL=payment-receipts.schema.js.map