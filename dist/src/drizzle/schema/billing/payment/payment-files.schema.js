"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentFiles = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const payments_schema_1 = require("./payments.schema");
const users_schema_1 = require("../../iam/users.schema");
exports.paymentFiles = (0, pg_core_1.pgTable)('payment_files', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    paymentId: (0, pg_core_1.uuid)('payment_id')
        .notNull()
        .references(() => payments_schema_1.payments.id, { onDelete: 'cascade' }),
    url: (0, pg_core_1.text)('url').notNull(),
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    mimeType: (0, pg_core_1.text)('mime_type').notNull(),
    sizeBytes: (0, pg_core_1.bigint)('size_bytes', { mode: 'number' }),
    kind: (0, pg_core_1.text)('kind').notNull().default('evidence'),
    note: (0, pg_core_1.text)('note'),
    uploadedByUserId: (0, pg_core_1.uuid)('uploaded_by_user_id').references(() => users_schema_1.users.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('payment_files_company_payment_idx').on(t.companyId, t.paymentId),
]);
//# sourceMappingURL=payment-files.schema.js.map