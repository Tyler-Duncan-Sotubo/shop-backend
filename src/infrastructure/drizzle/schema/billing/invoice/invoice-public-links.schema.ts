import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { invoices } from './invoices.schema';

export const invoicePublicLinks = pgTable(
  'invoice_public_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    companyId: uuid('company_id').notNull(),
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),

    // Random public token (what you share)
    token: text('token').notNull(),

    enabled: boolean('enabled').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: false }),

    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: false }),

    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: false })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: false })
      .notNull()
      .defaultNow(),

    // Optional metadata (ip, user-agent, etc.)
    meta: jsonb('meta'),
  },
  (t) => ({
    tokenUnique: uniqueIndex('invoice_public_links_token_unique').on(t.token),
    oneActiveLinkPerInvoice: uniqueIndex(
      'invoice_public_links_invoice_unique',
    ).on(t.invoiceId),
  }),
);
