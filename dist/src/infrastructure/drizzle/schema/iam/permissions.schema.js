"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissions = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
exports.permissions = (0, pg_core_1.pgTable)('permissions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    key: (0, pg_core_1.varchar)('key', { length: 150 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('uq_permissions_key').on(table.key),
    (0, pg_core_1.index)('idx_permissions_created_at').on(table.createdAt),
]);
//# sourceMappingURL=permissions.schema.js.map