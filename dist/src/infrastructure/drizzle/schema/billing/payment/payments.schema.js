"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.payments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const enum_schema_1 = require("../../enum.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const orders_schema_1 = require("../../commerce/orders/orders.schema");
const invoices_schema_1 = require("../invoice/invoices.schema");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
exports.payments = (0, pg_core_1.pgTable)('payments', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'cascade',
    }),
    orderId: (0, pg_core_1.uuid)('order_id').references(() => orders_schema_1.orders.id, {
        onDelete: 'set null',
    }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id').references(() => invoices_schema_1.invoices.id, {
        onDelete: 'set null',
    }),
    method: (0, enum_schema_1.paymentMethodEnum)('method').notNull(),
    status: (0, enum_schema_1.paymentStatusEnum)('status').notNull().default('pending'),
    currency: (0, pg_core_1.text)('currency').notNull(),
    amountMinor: (0, pg_core_1.bigint)('amount_minor', { mode: 'number' }).notNull(),
    reference: (0, pg_core_1.text)('reference'),
    provider: (0, pg_core_1.text)('provider'),
    providerRef: (0, pg_core_1.text)('provider_ref'),
    providerEventId: (0, pg_core_1.text)('provider_event_id'),
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true }),
    confirmedAt: (0, pg_core_1.timestamp)('confirmed_at', { withTimezone: true }),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id'),
    confirmedByUserId: (0, pg_core_1.uuid)('confirmed_by_user_id'),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('payments_company_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.index)('payments_company_order_idx').on(t.companyId, t.orderId),
    (0, pg_core_1.index)('payments_company_reference_idx').on(t.companyId, t.reference),
    (0, pg_core_1.index)('payments_company_provider_event_idx').on(t.companyId, t.provider, t.providerEventId),
    (0, pg_core_1.uniqueIndex)('payments_company_provider_ref_uq').on(t.companyId, t.provider, t.providerRef),
    (0, pg_core_1.uniqueIndex)('payments_company_provider_event_uq').on(t.companyId, t.provider, t.providerEventId),
]);
//# sourceMappingURL=payments.schema.js.map