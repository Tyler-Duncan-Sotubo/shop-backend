"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceBranding = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../../companies/companies.schema");
const invoice_templates_schema_1 = require("./invoice-templates.schema");
const id_1 = require("../../../id");
exports.invoiceBranding = (0, pg_core_1.pgTable)('invoice_branding', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id'),
    templateId: (0, pg_core_1.uuid)('template_id').references(() => invoice_templates_schema_1.invoiceTemplates.id, {
        onDelete: 'set null',
    }),
    logoUrl: (0, pg_core_1.text)('logo_url'),
    primaryColor: (0, pg_core_1.text)('primary_color'),
    supplierName: (0, pg_core_1.text)('supplier_name'),
    supplierAddress: (0, pg_core_1.text)('supplier_address'),
    supplierEmail: (0, pg_core_1.text)('supplier_email'),
    supplierPhone: (0, pg_core_1.text)('supplier_phone'),
    supplierTaxId: (0, pg_core_1.text)('supplier_tax_id'),
    bankDetails: (0, pg_core_1.jsonb)('bank_details'),
    footerNote: (0, pg_core_1.text)('footer_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('invoice_branding_company_store_idx').on(t.companyId, t.storeId),
]);
//# sourceMappingURL=invoice-branding.schema.js.map