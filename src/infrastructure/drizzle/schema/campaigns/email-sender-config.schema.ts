import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  text,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../companies/companies.schema';

export const emailSenderConfig = pgTable(
  'email_sender_config',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    companyId: uuid('company_id')
      .notNull()
      .unique() // one config per company
      .references(() => companies.id, { onDelete: 'cascade' }),

    fromEmail: varchar('from_email', { length: 255 }).notNull(), // hello@serene.ng
    fromName: varchar('from_name', { length: 255 }).notNull(), // Serene Supplies

    // Header branding
    logoUrl: text('logo_url'), // company logo in email header
    brandColor: varchar('brand_color', { length: 7 }), // hex e.g. #1a1a2e

    // Footer
    companyAddress: text('company_address'), // legal requirement for CAN-SPAM
    socialLinks: text('social_links_json'), // { instagram, twitter, facebook }
    footerTagline: varchar('footer_tagline', { length: 255 }), // optional e.g. "Quality you can trust"
  },
  (t) => [index('email_sender_config_company_idx').on(t.companyId)],
);

export type EmailSenderConfig = typeof emailSenderConfig.$inferSelect;
export type NewEmailSenderConfig = typeof emailSenderConfig.$inferInsert;
