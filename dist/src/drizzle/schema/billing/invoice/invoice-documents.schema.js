"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceDocuments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const invoice_templates_schema_1 = require("./invoice-templates.schema");
const invoices_schema_1 = require("./invoices.schema");
exports.invoiceDocuments = (0, pg_core_1.pgTable)('invoice_documents', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'restrict' }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id')
        .notNull()
        .references(() => invoices_schema_1.invoices.id, { onDelete: 'cascade' }),
    templateId: (0, pg_core_1.uuid)('template_id').references(() => invoice_templates_schema_1.invoiceTemplates.id, {
        onDelete: 'set null',
    }),
    kind: (0, pg_core_1.text)('kind').notNull().default('pdf'),
    storageKey: (0, pg_core_1.text)('storage_key').notNull(),
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    fileUrl: (0, pg_core_1.text)('file_url').notNull(),
    status: (0, pg_core_1.text)('status').notNull().default('generated'),
    supersededById: (0, pg_core_1.uuid)('superseded_by_id').references(() => exports.invoiceDocuments.id, { onDelete: 'set null' }),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('invoice_documents_company_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.index)('invoice_documents_invoice_created_idx').on(t.invoiceId, t.createdAt),
]);
//# sourceMappingURL=invoice-documents.schema.js.map