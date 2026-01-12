"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoices = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const enum_schema_1 = require("../../enum.schema");
const orders_schema_1 = require("../../commerce/orders/orders.schema");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const customers_schema_1 = require("../../customers/customers.schema");
const customer_addresses_schema_1 = require("../../customers/customer-addresses.schema");
const invoice_series_schema_1 = require("./invoice-series.schema");
const quote_requests_schema_1 = require("../../commerce/quotes/quote-requests.schema");
exports.invoices = (0, pg_core_1.pgTable)('invoices', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'restrict' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    orderId: (0, pg_core_1.uuid)('order_id').references(() => orders_schema_1.orders.id, {
        onDelete: 'set null',
    }),
    quoteRequestId: (0, pg_core_1.uuid)('quote_request_id').references(() => quote_requests_schema_1.quoteRequests.id, {
        onDelete: 'set null',
    }),
    type: (0, enum_schema_1.invoiceTypeEnum)('type').notNull().default('invoice'),
    status: (0, enum_schema_1.invoiceStatusEnum)('status').notNull().default('draft'),
    customerId: (0, pg_core_1.uuid)('customer_id').references(() => customers_schema_1.customers.id, {
        onDelete: 'set null',
    }),
    billingAddressId: (0, pg_core_1.uuid)('billing_address_id').references(() => customer_addresses_schema_1.customerAddresses.id, { onDelete: 'set null' }),
    shippingAddressId: (0, pg_core_1.uuid)('shipping_address_id').references(() => customer_addresses_schema_1.customerAddresses.id, { onDelete: 'set null' }),
    customerSnapshot: (0, pg_core_1.jsonb)('customer_snapshot'),
    supplierSnapshot: (0, pg_core_1.jsonb)('supplier_snapshot'),
    seriesId: (0, pg_core_1.uuid)('series_id').references(() => invoice_series_schema_1.invoiceSeries.id, {
        onDelete: 'set null',
    }),
    sequenceNumber: (0, pg_core_1.integer)('sequence_number'),
    number: (0, pg_core_1.text)('number'),
    issuedAt: (0, pg_core_1.timestamp)('issued_at', { withTimezone: true }),
    dueAt: (0, pg_core_1.timestamp)('due_at', { withTimezone: true }),
    currency: (0, pg_core_1.text)('currency').notNull(),
    exchangeRate: (0, pg_core_1.numeric)('exchange_rate', { precision: 18, scale: 8 }),
    subtotalMinor: (0, pg_core_1.bigint)('subtotal_minor', { mode: 'number' })
        .notNull()
        .default(0),
    discountMinor: (0, pg_core_1.bigint)('discount_minor', { mode: 'number' })
        .notNull()
        .default(0),
    shippingMinor: (0, pg_core_1.bigint)('shipping_minor', { mode: 'number' })
        .notNull()
        .default(0),
    taxMinor: (0, pg_core_1.bigint)('tax_minor', { mode: 'number' }).notNull().default(0),
    adjustmentMinor: (0, pg_core_1.bigint)('adjustment_minor', { mode: 'number' })
        .notNull()
        .default(0),
    roundingMinor: (0, pg_core_1.bigint)('rounding_minor', { mode: 'number' })
        .notNull()
        .default(0),
    totalMinor: (0, pg_core_1.bigint)('total_minor', { mode: 'number' }).notNull().default(0),
    paidMinor: (0, pg_core_1.bigint)('paid_minor', { mode: 'number' }).notNull().default(0),
    balanceMinor: (0, pg_core_1.bigint)('balance_minor', { mode: 'number' })
        .notNull()
        .default(0),
    lockedAt: (0, pg_core_1.timestamp)('locked_at', { withTimezone: true }),
    voidedAt: (0, pg_core_1.timestamp)('voided_at', { withTimezone: true }),
    voidReason: (0, pg_core_1.text)('void_reason'),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('invoices_company_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('invoices_company_customer_idx').on(t.companyId, t.customerId),
    (0, pg_core_1.index)('invoices_company_order_idx').on(t.companyId, t.orderId),
    (0, pg_core_1.index)('invoices_company_issued_idx').on(t.companyId, t.issuedAt),
    (0, pg_core_1.uniqueIndex)('invoices_company_number_uq').on(t.companyId, t.number),
    (0, pg_core_1.uniqueIndex)('invoices_company_order_type_uq').on(t.companyId, t.orderId, t.type),
    (0, pg_core_1.index)('invoices_company_series_seq_idx').on(t.companyId, t.seriesId, t.sequenceNumber),
]);
//# sourceMappingURL=invoices.schema.js.map