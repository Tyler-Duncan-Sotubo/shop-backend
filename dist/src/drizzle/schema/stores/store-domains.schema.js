"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeDomains = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const stores_schema_1 = require("./stores.schema");
const id_1 = require("../../id");
exports.storeDomains = (0, pg_core_1.pgTable)('store_domains', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    domain: (0, pg_core_1.text)('domain').notNull(),
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('store_domains_domain_unique').on(table.domain),
    (0, pg_core_1.index)('idx_store_domains_store_id').on(table.storeId),
]);
//# sourceMappingURL=store-domains.schema.js.map