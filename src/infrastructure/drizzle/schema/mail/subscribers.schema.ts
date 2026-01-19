import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { stores } from '../commerce/stores/stores.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id').references(() => stores.id, {
      onDelete: 'cascade',
    }),

    email: varchar('email', { length: 255 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('subscribed'), // subscribed | unsubscribed | pending
    source: varchar('source', { length: 64 }).default('form'), // form | checkout | popup | import | api
    metadata: jsonb('metadata').$type<Record<string, any>>(), // any extra (utm, page, ip, userAgent)

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // prevent duplicates per company (and store if you want store-level)
    uniqueIndex('subscribers_company_email_unique').on(t.companyId, t.email),
    index('subscribers_company_status_idx').on(t.companyId, t.status),
    index('subscribers_company_store_idx').on(t.companyId, t.storeId),
    uniqueIndex('subscribers_company_store_email_unique').on(
      t.companyId,
      t.storeId,
      t.email,
    ),
  ],
);
