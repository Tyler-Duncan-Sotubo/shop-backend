"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceLines = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const variants_schema_1 = require("../../catalogs/variants.schema");
const products_schema_1 = require("../../catalogs/products.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const invoices_schema_1 = require("./invoices.schema");
const orders_schema_1 = require("../../orders/orders.schema");
const taxes_schema_1 = require("../tax/taxes.schema");
exports.invoiceLines = (0, pg_core_1.pgTable)('invoice_lines', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'restrict' }),
    invoiceId: (0, pg_core_1.uuid)('invoice_id')
        .notNull()
        .references(() => invoices_schema_1.invoices.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id').references(() => products_schema_1.products.id, {
        onDelete: 'set null',
    }),
    variantId: (0, pg_core_1.uuid)('variant_id').references(() => variants_schema_1.productVariants.id, {
        onDelete: 'set null',
    }),
    orderId: (0, pg_core_1.uuid)('order_id').references(() => orders_schema_1.orders.id, {
        onDelete: 'set null',
    }),
    position: (0, pg_core_1.integer)('position').notNull().default(0),
    description: (0, pg_core_1.text)('description').notNull(),
    quantity: (0, pg_core_1.integer)('quantity').notNull().default(1),
    unitPriceMinor: (0, pg_core_1.bigint)('unit_price_minor', { mode: 'number' })
        .notNull()
        .default(0),
    discountMinor: (0, pg_core_1.bigint)('discount_minor', { mode: 'number' })
        .notNull()
        .default(0),
    lineNetMinor: (0, pg_core_1.bigint)('line_net_minor', { mode: 'number' })
        .notNull()
        .default(0),
    taxId: (0, pg_core_1.uuid)('tax_id').references(() => taxes_schema_1.taxes.id, {
        onDelete: 'set null',
    }),
    taxName: (0, pg_core_1.text)('tax_name'),
    taxRateBps: (0, pg_core_1.integer)('tax_rate_bps').notNull().default(0),
    taxInclusive: (0, pg_core_1.boolean)('tax_inclusive').notNull().default(false),
    taxExempt: (0, pg_core_1.boolean)('tax_exempt').notNull().default(false),
    taxExemptReason: (0, pg_core_1.text)('tax_exempt_reason'),
    taxMinor: (0, pg_core_1.bigint)('tax_minor', { mode: 'number' }).notNull().default(0),
    lineTotalMinor: (0, pg_core_1.bigint)('line_total_minor', { mode: 'number' })
        .notNull()
        .default(0),
    meta: (0, pg_core_1.jsonb)('meta'),
}, (t) => [
    (0, pg_core_1.index)('invoice_lines_company_invoice_idx').on(t.companyId, t.invoiceId),
    (0, pg_core_1.index)('invoice_lines_company_tax_idx').on(t.companyId, t.taxId),
    (0, pg_core_1.index)('invoice_lines_company_order_idx').on(t.companyId, t.orderId),
    (0, pg_core_1.uniqueIndex)('invoice_lines_company_invoice_position_uq').on(t.companyId, t.invoiceId, t.position),
]);
//# sourceMappingURL=invoice-lines.schema.js.map