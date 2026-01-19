"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentProviderEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const companies_schema_1 = require("../../companies/companies.schema");
const payments_schema_1 = require("./payments.schema");
exports.paymentProviderEvents = (0, pg_core_1.pgTable)('payment_provider_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    paymentId: (0, pg_core_1.uuid)('payment_id').references(() => payments_schema_1.payments.id, {
        onDelete: 'cascade',
    }),
    provider: (0, pg_core_1.text)('provider').notNull(),
    providerRef: (0, pg_core_1.text)('provider_ref'),
    providerEventId: (0, pg_core_1.text)('provider_event_id'),
    payload: (0, pg_core_1.jsonb)('payload'),
    receivedAt: (0, pg_core_1.timestamp)('received_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
}, (t) => [
    (0, pg_core_1.index)('ppe_company_provider_idx').on(t.companyId, t.provider),
    (0, pg_core_1.uniqueIndex)('ppe_company_provider_ref_uq').on(t.companyId, t.provider, t.providerRef),
    (0, pg_core_1.uniqueIndex)('ppe_company_provider_event_uq').on(t.companyId, t.provider, t.providerEventId),
]);
//# sourceMappingURL=payment-provider-events.schema.js.map