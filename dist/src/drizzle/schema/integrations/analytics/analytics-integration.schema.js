"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsIntegrations = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
exports.analyticsIntegrations = (0, pg_core_1.pgTable)('analytics_integrations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    provider: (0, pg_core_1.varchar)('provider', { length: 50 }).notNull(),
    publicConfig: (0, pg_core_1.jsonb)('public_config').notNull().default({}),
    privateConfig: (0, pg_core_1.jsonb)('private_config').notNull().default({}),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(true),
    requiresConsent: (0, pg_core_1.boolean)('requires_consent').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_analytics_company_store_provider').on(table.companyId, table.storeId, table.provider),
    (0, pg_core_1.index)('idx_analytics_company_store').on(table.companyId, table.storeId),
    (0, pg_core_1.index)('idx_analytics_company_id').on(table.companyId),
]);
//# sourceMappingURL=analytics-integration.schema.js.map