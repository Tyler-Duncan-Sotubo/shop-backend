"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceTaxSummary = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const invoices_schema_1 = require("./invoices.schema");
const companies_schema_1 = require("../../companies/companies.schema");
exports.invoiceTaxSummary = (0, pg_core_1.pgTable)('invoice_tax_summary', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'restrict' }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id')
        .notNull()
        .references(() => invoices_schema_1.invoices.id, { onDelete: 'cascade' }),
    taxName: (0, pg_core_1.text)('tax_name').notNull(),
    rateBps: (0, pg_core_1.integer)('rate_bps').notNull().default(0),
    taxableBaseMinor: (0, pg_core_1.bigint)('taxable_base_minor', { mode: 'number' })
        .notNull()
        .default(0),
    taxMinor: (0, pg_core_1.bigint)('tax_minor', { mode: 'number' }).notNull().default(0),
}, (t) => [
    (0, pg_core_1.index)('invoice_tax_summary_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.uniqueIndex)('invoice_tax_summary_uq').on(t.companyId, t.invoiceId, t.taxName, t.rateBps),
]);
//# sourceMappingURL=invoice-tax-summary.schema.js.map