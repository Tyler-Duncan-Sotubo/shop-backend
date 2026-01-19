"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companies = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
exports.companies = (0, pg_core_1.pgTable)('companies', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    name: (0, pg_core_1.text)('name').notNull(),
    slug: (0, pg_core_1.text)('slug').notNull(),
    legalName: (0, pg_core_1.text)('legal_name'),
    country: (0, pg_core_1.text)('country'),
    vatNumber: (0, pg_core_1.text)('vat_number'),
    defaultCurrency: (0, pg_core_1.text)('default_currency').notNull().default('NGN'),
    timezone: (0, pg_core_1.text)('timezone').notNull().default('UTC'),
    defaultLocale: (0, pg_core_1.text)('default_locale').notNull().default('en-NG'),
    billingEmail: (0, pg_core_1.text)('billing_email'),
    billingCustomerId: (0, pg_core_1.text)('billing_customer_id'),
    billingProvider: (0, pg_core_1.text)('billing_provider'),
    plan: (0, pg_core_1.text)('plan').notNull().default('free'),
    companySize: (0, pg_core_1.text)('company_size'),
    industry: (0, pg_core_1.text)('industry'),
    useCase: (0, pg_core_1.text)('use_case'),
    trialEndsAt: (0, pg_core_1.timestamp)('trial_ends_at', { mode: 'date' }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('companies_slug_unique').on(table.slug),
    (0, pg_core_1.index)('idx_companies_country').on(table.country),
    (0, pg_core_1.index)('idx_companies_plan').on(table.plan),
]);
//# sourceMappingURL=companies.schema.js.map