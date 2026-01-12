import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  jsonb,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/drizzle/id';
import { stores } from '../../commerce/stores/stores.schema';
import { companies } from '../../companies/companies.schema';
import { sql } from 'drizzle-orm';

export const paymentMethods = pgTable(
  'payment_methods',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    // "paystack" | "stripe" | "bank_transfer" | "cash_on_delivery" etc.
    method: text('method').notNull(),

    // paystack | stripe | null (for bank_transfer/cash_on_delivery)
    provider: text('provider'),

    // If enabled, method is available at checkout
    isEnabled: boolean('is_enabled').notNull().default(false),

    // json config:
    // - gateway: { publicKey, secretKey?, connectedAccountId?, ... }
    // - bank_transfer: { bankDetails: { accountName, accountNumber, bankName, instructions? } }
    config: jsonb('config'),

    status: text('status').notNull().default('disconnected'),

    // Last error string to show in UI (optional)
    lastError: text('last_error'),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { mode: 'date' }),
  },
  (t) => [
    // Gateways: one row per store + gateway provider (stripe, paystack, ...)
    uniqueIndex('uq_store_method_provider_gateway')
      .on(t.storeId, t.method, t.provider)
      .where(sql`${t.provider} IS NOT NULL`),

    // Non-gateways: one row per store + method (bank_transfer, cash, pos, ...)
    uniqueIndex('uq_store_method_non_gateway')
      .on(t.storeId, t.method)
      .where(sql`${t.provider} IS NULL`),

    index('idx_store_payment_methods_store_id').on(t.storeId),
    index('idx_store_payment_methods_enabled').on(t.isEnabled),
  ],
);
