import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const invoiceTemplates = pgTable(
  'invoice_templates',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    key: text('key').notNull(), // "classic", "minimal"
    version: text('version').notNull().default('v1'),
    name: text('name').notNull(),

    engine: text('engine').notNull().default('handlebars'),
    content: text('content').notNull(),
    css: text('css'),

    isActive: boolean('is_active').notNull().default(true),
    isDeprecated: boolean('is_deprecated').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    meta: jsonb('meta'),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex('invoice_templates_key_version_uq').on(t.key, t.version),
    index('invoice_templates_active_idx').on(t.isActive),
    index('invoice_templates_default_idx').on(t.isDefault),
  ],
);
