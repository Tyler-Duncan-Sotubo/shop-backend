"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
const enum_schema_1 = require("../enum.schema");
exports.customers = (0, pg_core_1.pgTable)('customers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 255 }).notNull(),
    type: (0, enum_schema_1.customerTypeEnum)('type').notNull().default('individual'),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }),
    billingEmail: (0, pg_core_1.varchar)('billing_email', { length: 255 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 50 }),
    taxId: (0, pg_core_1.varchar)('tax_id', { length: 100 }),
    marketingOptIn: (0, pg_core_1.boolean)('marketing_opt_in').notNull().default(false),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('customers_company_idx').on(t.companyId),
    (0, pg_core_1.index)('customers_company_active_idx').on(t.companyId, t.isActive),
    (0, pg_core_1.index)('customers_company_display_name_idx').on(t.companyId, t.displayName),
    (0, pg_core_1.uniqueIndex)('uq_customers_company_billing_email').on(t.companyId, t.billingEmail),
]);
//# sourceMappingURL=customers.schema.js.map