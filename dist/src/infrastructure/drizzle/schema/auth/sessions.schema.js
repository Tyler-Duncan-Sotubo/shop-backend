"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("../iam/users.schema");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    refreshTokenHash: (0, pg_core_1.varchar)('refresh_token_hash', {
        length: 255,
    }).notNull(),
    userAgent: (0, pg_core_1.varchar)('user_agent', { length: 500 }),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 100 }),
    isRevoked: (0, pg_core_1.boolean)('is_revoked').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { mode: 'date' }).notNull(),
    lastUsedAt: (0, pg_core_1.timestamp)('last_used_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_sessions_user_id').on(table.userId),
    (0, pg_core_1.index)('idx_sessions_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_sessions_is_revoked').on(table.isRevoked),
]);
//# sourceMappingURL=sessions.schema.js.map