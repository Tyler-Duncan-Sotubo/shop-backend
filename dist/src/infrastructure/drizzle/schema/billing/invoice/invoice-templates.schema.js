"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceTemplates = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
exports.invoiceTemplates = (0, pg_core_1.pgTable)('invoice_templates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    key: (0, pg_core_1.text)('key').notNull(),
    version: (0, pg_core_1.text)('version').notNull().default('v1'),
    name: (0, pg_core_1.text)('name').notNull(),
    engine: (0, pg_core_1.text)('engine').notNull().default('handlebars'),
    content: (0, pg_core_1.text)('content').notNull(),
    css: (0, pg_core_1.text)('css'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    isDeprecated: (0, pg_core_1.boolean)('is_deprecated').notNull().default(false),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    meta: (0, pg_core_1.jsonb)('meta'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('invoice_templates_key_version_uq').on(t.key, t.version),
    (0, pg_core_1.index)('invoice_templates_active_idx').on(t.isActive),
    (0, pg_core_1.index)('invoice_templates_default_idx').on(t.isDefault),
]);
//# sourceMappingURL=invoice-templates.schema.js.map