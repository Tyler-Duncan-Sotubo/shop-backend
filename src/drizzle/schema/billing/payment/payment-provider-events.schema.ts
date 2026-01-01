import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { payments } from './payments.schema';

export const paymentProviderEvents = pgTable(
  'payment_provider_events',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    paymentId: uuid('payment_id').references(() => payments.id, {
      onDelete: 'cascade',
    }),

    provider: text('provider').notNull(), // paystack, stripe, etc.
    providerRef: text('provider_ref'), // transaction reference
    providerEventId: text('provider_event_id'), // webhook event id

    payload: jsonb('payload'), // raw provider body (optional)
    receivedAt: timestamp('received_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index('ppe_company_provider_idx').on(t.companyId, t.provider),
    uniqueIndex('ppe_company_provider_ref_uq').on(
      t.companyId,
      t.provider,
      t.providerRef,
    ),
    uniqueIndex('ppe_company_provider_event_uq').on(
      t.companyId,
      t.provider,
      t.providerEventId,
    ),
  ],
);
