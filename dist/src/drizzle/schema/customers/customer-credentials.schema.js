"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerCredentials = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const customers_schema_1 = require("./customers.schema");
exports.customerCredentials = (0, pg_core_1.pgTable)('customer_credentials', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.uuid)('customer_id')
        .notNull()
        .references(() => customers_schema_1.customers.id, { onDelete: 'cascade' }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }),
    isVerified: (0, pg_core_1.boolean)('is_verified').notNull().default(false),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at', { withTimezone: true }),
    inviteTokenHash: (0, pg_core_1.varchar)('invite_token_hash', { length: 255 }),
    inviteExpiresAt: (0, pg_core_1.timestamp)('invite_expires_at', { withTimezone: true }),
    inviteAcceptedAt: (0, pg_core_1.timestamp)('invite_accepted_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('customer_credentials_company_idx').on(t.companyId),
    (0, pg_core_1.index)('customer_credentials_customer_idx').on(t.customerId),
    (0, pg_core_1.uniqueIndex)('customer_credentials_company_email_uq').on(t.companyId, t.email),
    (0, pg_core_1.uniqueIndex)('customer_credentials_customer_uq').on(t.customerId),
]);
//# sourceMappingURL=customer-credentials.schema.js.map