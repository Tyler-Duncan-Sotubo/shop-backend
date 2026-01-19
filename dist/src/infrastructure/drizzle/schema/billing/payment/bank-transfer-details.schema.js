"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankTransferDetails = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../../id");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
exports.bankTransferDetails = (0, pg_core_1.pgTable)('store_bank_transfer_details', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    accountName: (0, pg_core_1.text)('account_name').notNull(),
    accountNumber: (0, pg_core_1.text)('account_number').notNull(),
    bankName: (0, pg_core_1.text)('bank_name').notNull(),
    instructions: (0, pg_core_1.text)('instructions'),
    requireProof: (0, pg_core_1.boolean)('require_proof').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('store_bank_transfer_details_store_unique').on(t.storeId),
    (0, pg_core_1.index)('idx_store_bank_transfer_details_store_id').on(t.storeId),
]);
//# sourceMappingURL=bank-transfer-details.schema.js.map