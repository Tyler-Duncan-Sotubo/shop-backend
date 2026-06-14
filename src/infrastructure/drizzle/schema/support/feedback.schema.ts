import { pgTable, uuid, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { defaultId } from '../../id';

export const supportFeedback = pgTable('support_feedback', {
  id: uuid('id').primaryKey().$defaultFn(defaultId),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  companyId: uuid('company_id').notNull(),
  category: varchar('category', { length: 50 }).notNull().default('other'),
  message: text('message').notNull(),
  platform: varchar('platform', { length: 20 }).notNull().default('mobile'),
});
