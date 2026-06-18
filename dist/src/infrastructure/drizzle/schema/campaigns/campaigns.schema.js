"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaigns = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
const stores_schema_1 = require("../commerce/stores/stores.schema");
const enum_schema_1 = require("../enum.schema");
exports.campaigns = (0, pg_core_1.pgTable)('campaigns', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    channel: (0, enum_schema_1.creditChannelEnum)('channel').notNull().default('email'),
    templateType: (0, enum_schema_1.campaignTemplateTypeEnum)('template_type').notNull(),
    status: (0, enum_schema_1.campaignStatusEnum)('status').notNull().default('draft'),
    audienceType: (0, enum_schema_1.campaignAudienceTypeEnum)('audience_type')
        .notNull()
        .default('all'),
    subject: (0, pg_core_1.text)('subject').notNull(),
    previewText: (0, pg_core_1.text)('preview_text'),
    contentJson: (0, pg_core_1.text)('content_json'),
    scheduledAt: (0, pg_core_1.timestamp)('scheduled_at', { withTimezone: true }),
    sentAt: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    sentCount: (0, pg_core_1.integer)('sent_count').notNull().default(0),
    openCount: (0, pg_core_1.integer)('open_count').notNull().default(0),
    clickCount: (0, pg_core_1.integer)('click_count').notNull().default(0),
    unsubscribeCount: (0, pg_core_1.integer)('unsubscribe_count').notNull().default(0),
    resendBatchId: (0, pg_core_1.varchar)('resend_batch_id', { length: 255 }),
}, (t) => [
    (0, pg_core_1.index)('campaigns_company_idx').on(t.companyId),
    (0, pg_core_1.index)('campaigns_store_idx').on(t.storeId),
    (0, pg_core_1.index)('campaigns_status_idx').on(t.status),
    (0, pg_core_1.index)('campaigns_scheduled_at_idx').on(t.scheduledAt),
]);
//# sourceMappingURL=campaigns.schema.js.map