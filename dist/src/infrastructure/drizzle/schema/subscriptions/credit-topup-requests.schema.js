"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditTopupRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const enum_schema_1 = require("../enum.schema");
exports.creditTopupRequests = (0, pg_core_1.pgTable)('credit_topup_requests', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    credits: (0, pg_core_1.integer)('credits').notNull(),
    amountNGN: (0, pg_core_1.integer)('amount_ngn').notNull(),
    status: (0, enum_schema_1.topupStatusEnum)('status').notNull().default('pending'),
    paystackReference: (0, pg_core_1.text)('paystack_reference').notNull().unique(),
    paystackAccessCode: (0, pg_core_1.text)('paystack_access_code'),
    paidAt: (0, pg_core_1.timestamp)('paid_at', { withTimezone: true }),
    metadata: (0, pg_core_1.jsonb)('metadata'),
}, (t) => [
    (0, pg_core_1.index)('credit_topup_company_idx').on(t.companyId),
    (0, pg_core_1.index)('credit_topup_status_idx').on(t.status),
    (0, pg_core_1.index)('credit_topup_reference_idx').on(t.paystackReference),
]);
//# sourceMappingURL=credit-topup-requests.schema.js.map