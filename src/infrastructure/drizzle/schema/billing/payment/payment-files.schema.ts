import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { payments } from './payments.schema';
import { users } from '../../iam/users.schema';

export const paymentFiles = pgTable(
  'payment_files',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'cascade' }),

    url: text('url').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),

    kind: text('kind').notNull().default('evidence'), // 'evidence' | 'receipt'
    note: text('note'),

    uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('payment_files_company_payment_idx').on(t.companyId, t.paymentId),
  ],
);
