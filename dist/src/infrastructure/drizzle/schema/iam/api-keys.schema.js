"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeys = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
const stores_schema_1 = require("../commerce/stores/stores.schema");
exports.apiKeys = (0, pg_core_1.pgTable)('api_keys', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.varchar)('name', { length: 150 }).notNull(),
    keyHash: (0, pg_core_1.varchar)('key_hash', { length: 255 }).notNull(),
    prefix: (0, pg_core_1.varchar)('prefix', { length: 64 }).notNull(),
    scopes: (0, pg_core_1.text)('scopes').array(),
    allowedOrigins: (0, pg_core_1.text)('allowed_origins').array(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { mode: 'date' }),
    lastUsedAt: (0, pg_core_1.timestamp)('last_used_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_api_keys_prefix').on(table.prefix),
    (0, pg_core_1.index)('idx_api_keys_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_api_keys_is_active').on(table.isActive),
]);
//# sourceMappingURL=api-keys.schema.js.map