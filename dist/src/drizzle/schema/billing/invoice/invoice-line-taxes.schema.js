"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceLineTaxes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const invoice_lines_schema_1 = require("./invoice-lines.schema");
const invoices_schema_1 = require("./invoices.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const taxes_schema_1 = require("../tax/taxes.schema");
exports.invoiceLineTaxes = (0, pg_core_1.pgTable)('invoice_line_taxes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'restrict' }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id')
        .notNull()
        .references(() => invoices_schema_1.invoices.id, { onDelete: 'cascade' }),
    lineId: (0, pg_core_1.uuid)('line_id')
        .notNull()
        .references(() => invoice_lines_schema_1.invoiceLines.id, { onDelete: 'cascade' }),
    taxId: (0, pg_core_1.uuid)('tax_id').references(() => taxes_schema_1.taxes.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    rateBps: (0, pg_core_1.integer)('rate_bps').notNull().default(0),
    inclusive: (0, pg_core_1.boolean)('inclusive').notNull().default(false),
    taxableBaseMinor: (0, pg_core_1.bigint)('taxable_base_minor', { mode: 'number' })
        .notNull()
        .default(0),
    amountMinor: (0, pg_core_1.bigint)('amount_minor', { mode: 'number' })
        .notNull()
        .default(0),
}, (t) => [
    (0, pg_core_1.index)('invoice_line_taxes_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.index)('invoice_line_taxes_line_idx').on(t.companyId, t.lineId),
    (0, pg_core_1.index)('invoice_line_taxes_tax_idx').on(t.companyId, t.taxId),
    (0, pg_core_1.uniqueIndex)('invoice_line_taxes_line_tax_uq').on(t.companyId, t.lineId, t.taxId),
]);
//# sourceMappingURL=invoice-line-taxes.schema.js.map