"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAddresses = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const customers_schema_1 = require("./customers.schema");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
exports.customerAddresses = (0, pg_core_1.pgTable)('customer_addresses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    customerId: (0, pg_core_1.uuid)('customer_id')
        .notNull()
        .references(() => customers_schema_1.customers.id, { onDelete: 'cascade' }),
    label: (0, pg_core_1.varchar)('label', { length: 100 }),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    line1: (0, pg_core_1.varchar)('line1', { length: 255 }).notNull(),
    line2: (0, pg_core_1.varchar)('line2', { length: 255 }),
    city: (0, pg_core_1.varchar)('city', { length: 100 }).notNull(),
    state: (0, pg_core_1.varchar)('state', { length: 100 }),
    postalCode: (0, pg_core_1.varchar)('postal_code', { length: 50 }),
    country: (0, pg_core_1.varchar)('country', { length: 100 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    isDefaultBilling: (0, pg_core_1.boolean)('is_default_billing').notNull().default(false),
    isDefaultShipping: (0, pg_core_1.boolean)('is_default_shipping').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_customer_addresses_company_id').on(table.companyId),
    (0, pg_core_1.index)('idx_customer_addresses_customer_id').on(table.customerId),
]);
//# sourceMappingURL=customer-addresses.schema.js.map