"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zohoConnections = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../../companies/companies.schema");
const id_1 = require("../../../id");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
exports.zohoConnections = (0, pg_core_1.pgTable)('zoho_connections', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    refreshToken: (0, pg_core_1.text)('refresh_token').notNull(),
    accessToken: (0, pg_core_1.text)('access_token'),
    accessTokenExpiresAt: (0, pg_core_1.timestamp)('access_token_expires_at', {
        mode: 'date',
    }),
    zohoOrganizationId: (0, pg_core_1.text)('zoho_organization_id'),
    zohoOrganizationName: (0, pg_core_1.text)('zoho_organization_name'),
    region: (0, pg_core_1.text)('region').notNull().default('com'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    lastSyncedAt: (0, pg_core_1.timestamp)('last_synced_at', { mode: 'date' }),
    lastError: (0, pg_core_1.text)('last_error'),
    connectedAt: (0, pg_core_1.timestamp)('connected_at', { mode: 'date' })
        .notNull()
        .defaultNow(),
    disconnectedAt: (0, pg_core_1.timestamp)('disconnected_at', { mode: 'date' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_zoho_connections_company_store').on(table.companyId, table.storeId),
    (0, pg_core_1.uniqueIndex)('uq_zoho_connections_store').on(table.storeId),
]);
//# sourceMappingURL=zoho-connections.schema.js.map