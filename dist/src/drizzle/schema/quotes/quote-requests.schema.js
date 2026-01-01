"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quoteRequestItems = exports.quoteRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const id_1 = require("../../id");
const products_schema_1 = require("../catalogs/products.schema");
const variants_schema_1 = require("../catalogs/variants.schema");
exports.quoteRequests = (0, pg_core_1.pgTable)('quote_requests', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    status: (0, pg_core_1.text)('status').notNull().default('new'),
    customerEmail: (0, pg_core_1.text)('customer_email').notNull(),
    customerNote: (0, pg_core_1.text)('customer_note'),
    meta: (0, pg_core_1.jsonb)('meta').$type(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { mode: 'date' }),
    archivedAt: (0, pg_core_1.timestamp)('archived_at', { mode: 'date' }),
    convertedInvoiceId: (0, pg_core_1.uuid)('converted_invoice_id'),
    convertedOrderId: (0, pg_core_1.uuid)('converted_order_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_quote_requests_company_store').on(table.companyId, table.storeId),
    (0, pg_core_1.index)('idx_quote_requests_store_status').on(table.storeId, table.status),
    (0, pg_core_1.index)('idx_quote_requests_store_created').on(table.storeId, table.createdAt),
    (0, pg_core_1.index)('idx_quote_requests_expires').on(table.expiresAt),
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
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_quote_request_items_quote_position').on(table.quoteRequestId, table.position),
    (0, pg_core_1.index)('idx_quote_request_items_product').on(table.productId),
    (0, pg_core_1.index)('idx_quote_request_items_variant').on(table.variantId),
    (0, pg_core_1.uniqueIndex)('uq_quote_request_items_unique_line').on(table.quoteRequestId, table.productId, table.variantId, table.nameSnapshot),
]);
//# sourceMappingURL=quote-requests.schema.js.map