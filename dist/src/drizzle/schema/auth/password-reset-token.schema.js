"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetTokens = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_schema_1 = require("../iam/users.schema");
const id_1 = require("../../id");
exports.passwordResetTokens = (0, pg_core_1.pgTable)('password_reset_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => users_schema_1.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.text)('token').notNull(),
    isUsed: (0, pg_core_1.boolean)('is_used').notNull().default(false),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { mode: 'date' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.index)('idx_password_reset_tokens_user_id').on(table.userId),
    (0, pg_core_1.uniqueIndex)('uq_password_reset_tokens_token').on(table.token),
]);
//# sourceMappingURL=password-reset-token.schema.js.map