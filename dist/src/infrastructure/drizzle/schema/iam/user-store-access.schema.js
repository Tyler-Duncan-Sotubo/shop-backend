"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userStoreAccess = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const users_schema_1 = require("./users.schema");
const stores_schema_1 = require("../commerce/stores/stores.schema");
exports.userStoreAccess = (0, pg_core_1.pgTable)('user_store_access', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    grantedBy: (0, pg_core_1.uuid)('granted_by').references(() => users_schema_1.users.id, {
        onDelete: 'set null',
    }),
    grantedAt: (0, pg_core_1.timestamp)('granted_at', { mode: 'date' }).notNull().defaultNow(),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_user_store_access').on(table.userId, table.storeId),
    (0, pg_core_1.index)('idx_user_store_access_user_id').on(table.userId),
    (0, pg_core_1.index)('idx_user_store_access_store_id').on(table.storeId),
]);
//# sourceMappingURL=user-store-access.schema.js.map