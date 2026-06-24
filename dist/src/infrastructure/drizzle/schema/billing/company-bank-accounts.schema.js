"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyBankAccounts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
exports.companyBankAccounts = (0, pg_core_1.pgTable)('company_bank_accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    label: (0, pg_core_1.text)('label').notNull(),
    bankName: (0, pg_core_1.text)('bank_name').notNull(),
    accountName: (0, pg_core_1.text)('account_name').notNull(),
    accountNumber: (0, pg_core_1.text)('account_number').notNull(),
    tin: (0, pg_core_1.text)('tin'),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('company_bank_accounts_company_idx').on(t.companyId),
]);
//# sourceMappingURL=company-bank-accounts.schema.js.map