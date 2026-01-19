import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from '../iam/users.schema';
import { companies } from '../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    // hash of refresh token (or session token)
    refreshTokenHash: varchar('refresh_token_hash', {
      length: 255,
    }).notNull(),

    userAgent: varchar('user_agent', { length: 500 }),
    ipAddress: varchar('ip_address', { length: 100 }),

    isRevoked: boolean('is_revoked').notNull().default(false),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_company_id').on(table.companyId),
    index('idx_sessions_is_revoked').on(table.isRevoked),
  ],
);
