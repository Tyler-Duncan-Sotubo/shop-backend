"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    readAt: (0, pg_core_1.timestamp)('read_at', { withTimezone: true }),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    userId: (0, pg_core_1.uuid)('user_id'),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    body: (0, pg_core_1.text)('body'),
    data: (0, pg_core_1.jsonb)('data'),
    channel: (0, pg_core_1.varchar)('channel', { length: 20 }).notNull().default('in_app'),
}, (t) => [
    (0, pg_core_1.index)('notifications_company_idx').on(t.companyId),
    (0, pg_core_1.index)('notifications_user_idx').on(t.userId),
    (0, pg_core_1.index)('notifications_company_unread_idx').on(t.companyId, t.readAt),
    (0, pg_core_1.index)('notifications_user_unread_idx').on(t.userId, t.readAt),
    (0, pg_core_1.index)('notifications_company_created_idx').on(t.companyId, t.createdAt),
    (0, pg_core_1.index)('notifications_type_idx').on(t.companyId, t.type),
]);
//# sourceMappingURL=notifications.schema.js.map