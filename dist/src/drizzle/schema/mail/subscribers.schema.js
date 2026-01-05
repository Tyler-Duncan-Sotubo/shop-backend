"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const id_1 = require("../../id");
exports.subscribers = (0, pg_core_1.pgTable)('subscribers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'cascade',
    }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('subscribed'),
    source: (0, pg_core_1.varchar)('source', { length: 64 }).default('form'),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('subscribers_company_email_unique').on(t.companyId, t.email),
    (0, pg_core_1.index)('subscribers_company_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('subscribers_company_store_idx').on(t.companyId, t.storeId),
    (0, pg_core_1.uniqueIndex)('subscribers_company_store_email_unique').on(t.companyId, t.storeId, t.email),
]);
//# sourceMappingURL=subscribers.schema.js.map