"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailSenderConfig = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const id_1 = require("../../id");
const companies_schema_1 = require("../companies/companies.schema");
exports.emailSenderConfig = (0, pg_core_1.pgTable)('email_sender_config', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .unique()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    fromEmail: (0, pg_core_1.varchar)('from_email', { length: 255 }).notNull(),
    fromName: (0, pg_core_1.varchar)('from_name', { length: 255 }).notNull(),
    logoUrl: (0, pg_core_1.text)('logo_url'),
    brandColor: (0, pg_core_1.varchar)('brand_color', { length: 7 }),
    companyAddress: (0, pg_core_1.text)('company_address'),
    socialLinks: (0, pg_core_1.text)('social_links_json'),
    footerTagline: (0, pg_core_1.varchar)('footer_tagline', { length: 255 }),
}, (t) => [(0, pg_core_1.index)('email_sender_config_company_idx').on(t.companyId)]);
//# sourceMappingURL=email-sender-config.schema.js.map