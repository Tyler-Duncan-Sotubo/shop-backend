"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campaignEvents = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const campaigns_schema_1 = require("./campaigns.schema");
const companies_schema_1 = require("../companies/companies.schema");
const enum_schema_1 = require("../enum.schema");
exports.campaignEvents = (0, pg_core_1.pgTable)('campaign_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    campaignId: (0, pg_core_1.uuid)('campaign_id')
        .notNull()
        .references(() => campaigns_schema_1.campaigns.id, { onDelete: 'cascade' }),
    recipientEmail: (0, pg_core_1.varchar)('recipient_email', { length: 255 }).notNull(),
    resendMessageId: (0, pg_core_1.varchar)('resend_message_id', { length: 255 }),
    eventType: (0, enum_schema_1.campaignEventTypeEnum)('event_type').notNull(),
    clickedUrl: (0, pg_core_1.text)('clicked_url'),
}, (t) => [
    (0, pg_core_1.index)('campaign_events_campaign_idx').on(t.campaignId),
    (0, pg_core_1.index)('campaign_events_company_idx').on(t.companyId),
    (0, pg_core_1.index)('campaign_events_email_idx').on(t.recipientEmail),
    (0, pg_core_1.index)('campaign_events_resend_msg_idx').on(t.resendMessageId),
    (0, pg_core_1.index)('campaign_events_type_idx').on(t.eventType),
]);
//# sourceMappingURL=campaign-events.schema.js.map