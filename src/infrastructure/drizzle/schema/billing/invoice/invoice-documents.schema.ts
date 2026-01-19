import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { invoiceTemplates } from './invoice-templates.schema';
import { invoices } from './invoices.schema';

export const invoiceDocuments = pgTable(
  'invoice_documents',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'restrict' }),

    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),

    templateId: uuid('template_id').references(() => invoiceTemplates.id, {
      onDelete: 'set null',
    }),

    kind: text('kind').notNull().default('pdf'), // pdf, xml, etc.

    // Storage (prefer key; generate URL at runtime)
    storageKey: text('storage_key').notNull(),
    fileName: text('file_name').notNull(),
    fileUrl: text('file_url').notNull(),

    status: text('status').notNull().default('generated'), // generated|superseded|failed
    supersededById: uuid('superseded_by_id').references(
      () => invoiceDocuments.id,
      { onDelete: 'set null' },
    ),

    meta: jsonb('meta'), // render timing, checksum, engine version, errors, etc.

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('invoice_documents_company_invoice_idx').on(t.companyId, t.invoiceId),
    index('invoice_documents_invoice_created_idx').on(t.invoiceId, t.createdAt),
  ],
);
