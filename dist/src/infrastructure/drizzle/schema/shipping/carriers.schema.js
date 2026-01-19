"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carriers = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const id_1 = require("../../id");
exports.carriers = (0, pg_core_1.pgTable)('carriers', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    providerKey: (0, pg_core_1.text)('provider_key').notNull(),
    name: (0, pg_core_1.text)('name').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    settings: (0, pg_core_1.jsonb)('settings').$type(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.index)('carriers_company_idx').on(t.companyId),
    (0, pg_core_1.index)('carriers_company_active_idx').on(t.companyId, t.isActive),
    (0, pg_core_1.index)('carriers_company_provider_idx').on(t.companyId, t.providerKey),
    (0, pg_core_1.uniqueIndex)('carriers_company_provider_uniq').on(t.companyId, t.providerKey),
]);
//# sourceMappingURL=carriers.schema.js.map