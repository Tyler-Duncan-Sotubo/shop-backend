"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerContacts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const customers_schema_1 = require("./customers.schema");
exports.customerContacts = (0, pg_core_1.pgTable)('customer_contacts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.uuid)('customer_id')
        .notNull()
        .references(() => customers_schema_1.customers.id, { onDelete: 'cascade' }),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    isPrimary: (0, pg_core_1.boolean)('is_primary').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('customer_contacts_company_idx').on(t.companyId),
    (0, pg_core_1.index)('customer_contacts_customer_idx').on(t.customerId),
    (0, pg_core_1.uniqueIndex)('customer_contacts_customer_primary_soft_uq').on(t.customerId, t.isPrimary),
]);
//# sourceMappingURL=customer-contacts.schema.js.map