"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditTransactions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const enum_schema_1 = require("../enum.schema");
exports.creditTransactions = (0, pg_core_1.pgTable)('credit_transactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    channel: (0, enum_schema_1.creditChannelEnum)('channel').notNull(),
    type: (0, enum_schema_1.creditTransactionTypeEnum)('type').notNull(),
    amount: (0, pg_core_1.integer)('amount').notNull(),
    balanceAfter: (0, pg_core_1.integer)('balance_after').notNull(),
    referenceType: (0, pg_core_1.varchar)('reference_type', { length: 50 }),
    referenceId: (0, pg_core_1.uuid)('reference_id'),
    note: (0, pg_core_1.text)('note'),
}, (t) => [
    (0, pg_core_1.index)('credit_tx_company_idx').on(t.companyId),
    (0, pg_core_1.index)('credit_tx_channel_idx').on(t.channel),
    (0, pg_core_1.index)('credit_tx_type_idx').on(t.type),
    (0, pg_core_1.index)('credit_tx_reference_idx').on(t.referenceType, t.referenceId),
]);
//# sourceMappingURL=credit-transactions.schema.js.map