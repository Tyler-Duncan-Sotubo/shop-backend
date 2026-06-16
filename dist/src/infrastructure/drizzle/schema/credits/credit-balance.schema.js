"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditBalance = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
exports.creditBalance = (0, pg_core_1.pgTable)('credit_balance', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .unique()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    balance: (0, pg_core_1.integer)('balance').notNull().default(0),
    lifetimeCredits: (0, pg_core_1.integer)('lifetime_credits').notNull().default(0),
}, (t) => [(0, pg_core_1.index)('credit_balance_company_idx').on(t.companyId)]);
//# sourceMappingURL=credit-balance.schema.js.map