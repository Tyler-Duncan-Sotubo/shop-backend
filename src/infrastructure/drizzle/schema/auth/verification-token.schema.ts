import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from '../iam/users.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    token: text('token').notNull(),
    isUsed: boolean('is_used').notNull().default(false),

    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_verification_tokens_user_id').on(table.userId),
    uniqueIndex('uq_verification_tokens_token').on(table.token),
  ],
);
