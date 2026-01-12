"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentProviderConnections = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
exports.paymentProviderConnections = (0, pg_core_1.pgTable)('payment_provider_connections', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    provider: (0, pg_core_1.text)('provider').notNull(),
    secretKeyEnc: (0, pg_core_1.text)('secret_key_enc'),
    publicKeyEnc: (0, pg_core_1.text)('public_key_enc'),
    accessTokenEnc: (0, pg_core_1.text)('access_token_enc'),
    refreshTokenEnc: (0, pg_core_1.text)('refresh_token_enc'),
    providerAccountId: (0, pg_core_1.text)('provider_account_id'),
    connectedAt: (0, pg_core_1.timestamp)('connected_at', { mode: 'date' }),
    lastVerifiedAt: (0, pg_core_1.timestamp)('last_verified_at', { mode: 'date' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('store_provider_connections_store_provider_unique').on(t.storeId, t.provider),
    (0, pg_core_1.index)('idx_store_provider_connections_store_id').on(t.storeId),
]);
//# sourceMappingURL=payment-provider-connections.schema.js.map