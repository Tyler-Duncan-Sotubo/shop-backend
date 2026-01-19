"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicePublicLinks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const invoices_schema_1 = require("./invoices.schema");
exports.invoicePublicLinks = (0, pg_core_1.pgTable)('invoice_public_links', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    invoiceId: (0, pg_core_1.uuid)('invoice_id')
        .notNull()
        .references(() => invoices_schema_1.invoices.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.text)('token').notNull(),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: false }),
    viewCount: (0, pg_core_1.integer)('view_count').notNull().default(0),
    lastViewedAt: (0, pg_core_1.timestamp)('last_viewed_at', { withTimezone: false }),
    createdBy: (0, pg_core_1.uuid)('created_by').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: false })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: false })
        .notNull()
        .defaultNow(),
    meta: (0, pg_core_1.jsonb)('meta'),
}, (t) => ({
    tokenUnique: (0, pg_core_1.uniqueIndex)('invoice_public_links_token_unique').on(t.token),
    oneActiveLinkPerInvoice: (0, pg_core_1.uniqueIndex)('invoice_public_links_invoice_unique').on(t.invoiceId),
}));
//# sourceMappingURL=invoice-public-links.schema.js.map