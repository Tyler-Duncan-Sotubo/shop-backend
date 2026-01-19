"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsTags = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../commerce/stores/stores.schema");
exports.analyticsTags = (0, pg_core_1.pgTable)('analytics_tags', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'set null',
    }),
    name: (0, pg_core_1.text)('name').notNull(),
    token: (0, pg_core_1.text)('token').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdByUserId: (0, pg_core_1.uuid)('created_by_user_id'),
    revokedAt: (0, pg_core_1.timestamp)('revoked_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    meta: (0, pg_core_1.jsonb)('meta'),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('analytics_tags_company_token_uq').on(t.companyId, t.token),
    (0, pg_core_1.index)('analytics_tags_company_store_idx').on(t.companyId, t.storeId),
    (0, pg_core_1.index)('analytics_tags_company_active_idx').on(t.companyId, t.isActive),
]);
//# sourceMappingURL=analytics-tags.schema.js.map