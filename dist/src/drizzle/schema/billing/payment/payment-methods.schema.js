"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentMethods = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
const companies_schema_1 = require("../../companies/companies.schema");
const drizzle_orm_1 = require("drizzle-orm");
exports.paymentMethods = (0, pg_core_1.pgTable)('payment_methods', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    method: (0, pg_core_1.text)('method').notNull(),
    provider: (0, pg_core_1.text)('provider'),
    isEnabled: (0, pg_core_1.boolean)('is_enabled').notNull().default(false),
    config: (0, pg_core_1.jsonb)('config'),
    status: (0, pg_core_1.text)('status').notNull().default('disconnected'),
    lastError: (0, pg_core_1.text)('last_error'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_store_method_provider_gateway')
        .on(t.storeId, t.method, t.provider)
        .where((0, drizzle_orm_1.sql) `${t.provider} IS NOT NULL`),
    (0, pg_core_1.uniqueIndex)('uq_store_method_non_gateway')
        .on(t.storeId, t.method)
        .where((0, drizzle_orm_1.sql) `${t.provider} IS NULL`),
    (0, pg_core_1.index)('idx_store_payment_methods_store_id').on(t.storeId),
    (0, pg_core_1.index)('idx_store_payment_methods_enabled').on(t.isEnabled),
]);
//# sourceMappingURL=payment-methods.schema.js.map