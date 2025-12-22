// src/modules/billing/invoices/schema/invoice-branding.schema.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { invoiceTemplates } from './invoice-templates.schema';
import { defaultId } from 'src/drizzle/id';

export const invoiceBranding = pgTable(
  'invoice_branding',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // null = default for company; non-null = store-specific
    storeId: uuid('store_id'),

    templateId: uuid('template_id').references(() => invoiceTemplates.id, {
      onDelete: 'set null',
    }),

    logoUrl: text('logo_url'),
    primaryColor: text('primary_color'),

    supplierName: text('supplier_name'),
    supplierAddress: text('supplier_address'),
    supplierEmail: text('supplier_email'),
    supplierPhone: text('supplier_phone'),
    supplierTaxId: text('supplier_tax_id'),

    bankDetails: jsonb('bank_details'),
    footerNote: text('footer_note'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('invoice_branding_company_store_idx').on(t.companyId, t.storeId),
  ],
);
