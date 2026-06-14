"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportFeedback = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
exports.supportFeedback = (0, pg_core_1.pgTable)('support_feedback', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at').notNull().defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id').notNull(),
    category: (0, pg_core_1.varchar)('category', { length: 50 }).notNull().default('other'),
    message: (0, pg_core_1.text)('message').notNull(),
    platform: (0, pg_core_1.varchar)('platform', { length: 20 }).notNull().default('mobile'),
});
//# sourceMappingURL=feedback.schema.js.map