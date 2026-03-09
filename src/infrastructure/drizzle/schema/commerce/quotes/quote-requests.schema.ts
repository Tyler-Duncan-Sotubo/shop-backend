import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  integer,
  jsonb,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { stores } from '../stores/stores.schema'; // adjust path/name to your stores table
import { defaultId } from 'src/infrastructure/drizzle/id';
import { products } from '../../catalogs/products.schema';
import { productVariants } from '../../catalogs/variants.schema';

export const quoteRequests = pgTable(
  'quote_requests',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    quoteNumber: varchar('quote_number', { length: 32 }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    status: text('status').notNull().default('new'),

    // Customer input
    customerEmail: text('customer_email').notNull(),
    customerNote: text('customer_note'),

    // Optional metadata (utm, referrer, device, etc.)
    meta: jsonb('meta').$type<Record<string, unknown>>(),

    // TTL / lifecycle
    expiresAt: timestamp('expires_at', { mode: 'date' }),
    archivedAt: timestamp('archived_at', { mode: 'date' }),

    // Optional links to downstream objects
    convertedInvoiceId: uuid('converted_invoice_id'),
    convertedOrderId: uuid('converted_order_id'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),

    // Quote lifecycle
    createdZohoAt: timestamp('created_zoho_at', { mode: 'date' }),
    sentAt: timestamp('sent_at', { mode: 'date' }),
    acceptedAt: timestamp('accepted_at', { mode: 'date' }),
    convertedAt: timestamp('converted_at', { mode: 'date' }),

    // Money
    currency: text('currency').default('GBP'),

    totalsSnapshot: jsonb('totals_snapshot').$type<{
      subtotal?: number;
      tax?: number;
      shipping?: number;
      discount?: number;
      total?: number;
    }>(),

    // Zoho estimate ownership on quote (all nullable)
    zohoContactId: text('zoho_contact_id'),
    zohoOrganizationId: text('zoho_organization_id'),
    zohoEstimateId: text('zoho_estimate_id'),
    zohoEstimateNumber: text('zoho_estimate_number'),
    zohoEstimateStatus: text('zoho_estimate_status'),

    // Sync health
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date' }),
    syncError: text('sync_error'),
  },
  (table) => [
    index('idx_quote_requests_company_store').on(
      table.companyId,
      table.storeId,
    ),
    index('idx_quote_requests_store_status').on(table.storeId, table.status),
    index('idx_quote_requests_store_created').on(
      table.storeId,
      table.createdAt,
    ),
    index('idx_quote_requests_expires').on(table.expiresAt),
    index('idx_quote_requests_zoho_estimate_id').on(table.zohoEstimateId),
    uniqueIndex('quote_requests_company_quote_number_unique').on(
      table.companyId,
      table.quoteNumber,
    ),
  ],
);

export const quoteRequestItems = pgTable(
  'quote_request_items',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    quoteRequestId: uuid('quote_request_id')
      .notNull()
      .references(() => quoteRequests.id, { onDelete: 'cascade' }),

    // Optional product references (can be null for custom lines)
    productId: uuid('product_id').references(() => products.id, {
      onDelete: 'set null',
    }),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),

    // Snapshot fields so quote remains readable even if product changes later
    nameSnapshot: text('name_snapshot').notNull(),
    variantSnapshot: text('variant_snapshot'), // e.g. "Size: Twin · Color: Blue"

    // Any selected attributes (Size/Color/etc.)
    attributes: jsonb('attributes').$type<Record<string, string | null>>(),
    imageUrl: text('image_url'), // optional snapshot for UI
    quantity: integer('quantity').notNull().default(1),
    position: integer('position').notNull().default(1),

    // ✅ Admin pricing (minor units, e.g. pennies)
    unitPriceMinor: integer('unit_price_minor'), // null until quoted
    discountMinor: integer('discount_minor').default(0), // optional
    lineNote: text('line_note'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (table) => [
    index('idx_quote_request_items_quote_position').on(
      table.quoteRequestId,
      table.position,
    ),
    index('idx_quote_request_items_product').on(table.productId),
    index('idx_quote_request_items_variant').on(table.variantId),

    // Prevent duplicates of the same product+variant within a quote request
    uniqueIndex('uq_quote_request_items_unique_line').on(
      table.quoteRequestId,
      table.productId,
      table.variantId,
      table.nameSnapshot,
    ),
  ],
);

export const quoteCounters = pgTable(
  'quote_counters',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    companyId: uuid('company_id').notNull(),
    nextNumber: integer('next_number').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex('quote_counters_company_unique').on(t.companyId)],
);
