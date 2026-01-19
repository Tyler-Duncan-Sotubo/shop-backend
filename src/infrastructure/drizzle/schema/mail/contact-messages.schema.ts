import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { stores } from '../commerce/stores/stores.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    // optional: message belongs to a store (if you route forms by store)
    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'cascade',
    }),

    name: varchar('name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 255 }),
    message: text('message').notNull(),
    company: varchar('company', { length: 255 }),
    status: varchar('status', { length: 32 }).notNull().default('new'),
    subject: varchar('subject', { length: 255 }),

    metadata: jsonb('metadata').$type<{
      ip?: string;
      userAgent?: string;
      pageUrl?: string;
      referrer?: string;
      [k: string]: any;
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('contact_messages_company_created_idx').on(t.companyId, t.createdAt),
    index('contact_messages_company_status_idx').on(t.companyId, t.status),
    index('contact_messages_company_store_idx').on(t.companyId, t.storeId),
    index('contact_messages_company_email_idx').on(t.companyId, t.email),
    index('contact_messages_company_subject_idx').on(t.companyId, t.subject),
  ],
);
