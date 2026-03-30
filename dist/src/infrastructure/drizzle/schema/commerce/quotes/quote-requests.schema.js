"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteCounters = exports.quoteRequestItems = exports.quoteRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const id_1 = require("../../../id");
const products_schema_1 = require("../../catalogs/products.schema");
const variants_schema_1 = require("../../catalogs/variants.schema");
exports.quoteRequests = (0, pg_core_1.pgTable)('quote_requests', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    quoteNumber: (0, pg_core_1.varchar)('quote_number', { length: 32 }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    status: (0, pg_core_1.text)('status').notNull().default('new'),
    customerEmail: (0, pg_core_1.text)('customer_email').notNull(),
    customerNote: (0, pg_core_1.text)('customer_note'),
    customerName: (0, pg_core_1.text)('customer_name'),
    meta: (0, pg_core_1.jsonb)('meta').$type(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { mode: 'date' }),
    archivedAt: (0, pg_core_1.timestamp)('archived_at', { mode: 'date' }),
    convertedInvoiceId: (0, pg_core_1.uuid)('converted_invoice_id'),
    convertedOrderId: (0, pg_core_1.uuid)('converted_order_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
    createdZohoAt: (0, pg_core_1.timestamp)('created_zoho_at', { mode: 'date' }),
    sentAt: (0, pg_core_1.timestamp)('sent_at', { mode: 'date' }),
    acceptedAt: (0, pg_core_1.timestamp)('accepted_at', { mode: 'date' }),
    convertedAt: (0, pg_core_1.timestamp)('converted_at', { mode: 'date' }),
    currency: (0, pg_core_1.text)('currency').default('GBP'),
    totalsSnapshot: (0, pg_core_1.jsonb)('totals_snapshot').$type(),
    zohoContactId: (0, pg_core_1.text)('zoho_contact_id'),
    zohoOrganizationId: (0, pg_core_1.text)('zoho_organization_id'),
    zohoEstimateId: (0, pg_core_1.text)('zoho_estimate_id'),
    zohoEstimateNumber: (0, pg_core_1.text)('zoho_estimate_number'),
    zohoEstimateStatus: (0, pg_core_1.text)('zoho_estimate_status'),
    lastSyncedAt: (0, pg_core_1.timestamp)('last_synced_at', { mode: 'date' }),
    syncError: (0, pg_core_1.text)('sync_error'),
}, (table) => [
    (0, pg_core_1.index)('idx_quote_requests_company_store').on(table.companyId, table.storeId),
    (0, pg_core_1.index)('idx_quote_requests_store_status').on(table.storeId, table.status),
    (0, pg_core_1.index)('idx_quote_requests_store_created').on(table.storeId, table.createdAt),
    (0, pg_core_1.index)('idx_quote_requests_expires').on(table.expiresAt),
    (0, pg_core_1.index)('idx_quote_requests_zoho_estimate_id').on(table.zohoEstimateId),
    (0, pg_core_1.uniqueIndex)('quote_requests_company_quote_number_unique').on(table.companyId, table.quoteNumber),
]);
exports.quoteRequestItems = (0, pg_core_1.pgTable)('quote_request_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    quoteRequestId: (0, pg_core_1.uuid)('quote_request_id')
        .notNull()
        .references(() => exports.quoteRequests.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id').references(() => products_schema_1.products.id, {
        onDelete: 'set null',
    }),
    variantId: (0, pg_core_1.uuid)('variant_id').references(() => variants_schema_1.productVariants.id, {
        onDelete: 'set null',
    }),
    nameSnapshot: (0, pg_core_1.text)('name_snapshot').notNull(),
    variantSnapshot: (0, pg_core_1.text)('variant_snapshot'),
    attributes: (0, pg_core_1.jsonb)('attributes').$type(),
    imageUrl: (0, pg_core_1.text)('image_url'),
    quantity: (0, pg_core_1.integer)('quantity').notNull().default(1),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    unitPriceMinor: (0, pg_core_1.integer)('unit_price_minor'),
    discountMinor: (0, pg_core_1.integer)('discount_minor').default(0),
    lineNote: (0, pg_core_1.text)('line_note'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_quote_request_items_quote_position').on(table.quoteRequestId, table.position),
    (0, pg_core_1.index)('idx_quote_request_items_product').on(table.productId),
    (0, pg_core_1.index)('idx_quote_request_items_variant').on(table.variantId),
    (0, pg_core_1.uniqueIndex)('uq_quote_request_items_unique_line').on(table.quoteRequestId, table.productId, table.variantId, table.nameSnapshot),
]);
exports.quoteCounters = (0, pg_core_1.pgTable)('quote_counters', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    nextNumber: (0, pg_core_1.integer)('next_number').notNull().default(1),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [(0, pg_core_1.uniqueIndex)('quote_counters_company_unique').on(t.companyId)]);
//# sourceMappingURL=quote-requests.schema.js.map