import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { companies } from '../companies/companies.schema';
import { companyRoles } from './company-roles.schema';
import { defaultId } from 'src/drizzle/id';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    firstName: varchar('first_name', { length: 100 }),
    lastName: varchar('last_name', { length: 100 }),

    email: varchar('email', { length: 255 }).notNull(),
    password: varchar('password', { length: 255 }).notNull(),

    isVerified: boolean('is_verified').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    lastLogin: timestamp('last_login', { mode: 'date' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),

    avatar: varchar('avatar', { length: 500 }),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    companyRoleId: uuid('company_role_id')
      .notNull()
      .references(() => companyRoles.id, { onDelete: 'cascade' }),

    // optional inline verification code if you still want it here
    verificationCode: varchar('verification_code', { length: 6 }),
    verificationCodeExpiresAt: timestamp('verification_code_expires_at', {
      mode: 'date',
    }),

    allowMarketingEmails: boolean('allow_marketing_emails')
      .notNull()
      .default(false),

    onboardingCompleted: boolean('onboarding_completed')
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex('uq_users_email').on(table.email),
    index('idx_users_company_id').on(table.companyId),
    index('idx_users_company_role_id').on(table.companyRoleId),
  ],
);
