"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentAllocations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const enum_schema_1 = require("../../enum.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const invoices_schema_1 = require("../invoice/invoices.schema");
const payments_schema_1 = require("./payments.schema");
exports.paymentAllocations = (0, pg_core_1.pgTable)('payment_allocations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    paymentId: (0, pg_core_1.uuid)('payment_id')
        .notNull()
        .references(() => payments_schema_1.payments.id, { onDelete: 'cascade' }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id')
        .notNull()
        .references(() => invoices_schema_1.invoices.id, { onDelete: 'cascade' }),
    status: (0, enum_schema_1.allocationStatusEnum)('status').notNull().default('applied'),
    amountMinor: (0, pg_core_1.bigint)('amount_minor', { mode: 'number' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('pay_alloc_company_payment_idx').on(t.companyId, t.paymentId),
    (0, pg_core_1.index)('pay_alloc_company_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.uniqueIndex)('pay_alloc_company_payment_invoice_uq').on(t.companyId, t.paymentId, t.invoiceId),
]);
//# sourceMappingURL=payment-allocations.schema.js.map