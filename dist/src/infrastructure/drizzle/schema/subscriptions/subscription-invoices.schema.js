"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionInvoices = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const company_subscriptions_schema_1 = require("./company-subscriptions.schema");
const credit_topup_requests_schema_1 = require("./credit-topup-requests.schema");
const companies_schema_1 = require("../companies/companies.schema");
const enum_schema_1 = require("../enum.schema");
exports.subscriptionInvoices = (0, pg_core_1.pgTable)('subscription_invoices', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    subscriptionId: (0, pg_core_1.uuid)('subscription_id').references(() => company_subscriptions_schema_1.companySubscriptions.id, { onDelete: 'set null' }),
    topupRequestId: (0, pg_core_1.uuid)('topup_request_id').references(() => credit_topup_requests_schema_1.creditTopupRequests.id, { onDelete: 'set null' }),
    type: (0, enum_schema_1.subscriptionInvoiceTypeEnum)('type').notNull(),
    status: (0, enum_schema_1.subscriptionInvoiceStatusEnum)('status').notNull(),
    amountNGN: (0, pg_core_1.integer)('amount_ngn').notNull(),
    paystackReference: (0, pg_core_1.text)('paystack_reference'),
    paidAt: (0, pg_core_1.timestamp)('paid_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.index)('subscription_invoices_company_idx').on(t.companyId),
    (0, pg_core_1.index)('subscription_invoices_type_idx').on(t.type),
    (0, pg_core_1.index)('subscription_invoices_status_idx').on(t.status),
    (0, pg_core_1.index)('subscription_invoices_sub_idx').on(t.subscriptionId),
    (0, pg_core_1.index)('subscription_invoices_topup_idx').on(t.topupRequestId),
]);
//# sourceMappingURL=subscription-invoices.schema.js.map