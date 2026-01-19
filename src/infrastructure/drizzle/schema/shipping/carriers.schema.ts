import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const carriers = pgTable(
  'carriers',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // examples: "manual", "gig", "kwik", "sendbox", "dhl", "fedex", "ups"
    providerKey: text('provider_key').notNull(),

    name: text('name').notNull(), // display name: "GIG Logistics"
    isActive: boolean('is_active').notNull().default(true),

    // integration/display settings, service mapping, etc.
    settings: jsonb('settings').$type<Record<string, any>>(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('carriers_company_idx').on(t.companyId),
    index('carriers_company_active_idx').on(t.companyId, t.isActive),
    index('carriers_company_provider_idx').on(t.companyId, t.providerKey),
    uniqueIndex('carriers_company_provider_uniq').on(
      t.companyId,
      t.providerKey,
    ),
  ],
);
