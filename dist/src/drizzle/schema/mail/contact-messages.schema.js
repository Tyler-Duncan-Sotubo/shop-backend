"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactMessages = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../stores/stores.schema");
const id_1 = require("../../id");
exports.contactMessages = (0, pg_core_1.pgTable)('contact_messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id').references(() => stores_schema_1.stores.id, {
        onDelete: 'cascade',
    }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 255 }),
    message: (0, pg_core_1.text)('message').notNull(),
    company: (0, pg_core_1.varchar)('company', { length: 255 }),
    status: (0, pg_core_1.varchar)('status', { length: 32 }).notNull().default('new'),
    subject: (0, pg_core_1.varchar)('subject', { length: 255 }),
    metadata: (0, pg_core_1.jsonb)('metadata').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('contact_messages_company_created_idx').on(t.companyId, t.createdAt),
    (0, pg_core_1.index)('contact_messages_company_status_idx').on(t.companyId, t.status),
    (0, pg_core_1.index)('contact_messages_company_store_idx').on(t.companyId, t.storeId),
    (0, pg_core_1.index)('contact_messages_company_email_idx').on(t.companyId, t.email),
    (0, pg_core_1.index)('contact_messages_company_subject_idx').on(t.companyId, t.subject),
]);
//# sourceMappingURL=contact-messages.schema.js.map