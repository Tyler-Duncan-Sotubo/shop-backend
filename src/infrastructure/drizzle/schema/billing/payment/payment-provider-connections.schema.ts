import {
  pgTable,
  uuid,
  text,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { stores } from '../../commerce/stores/stores.schema';

export const paymentProviderConnections = pgTable(
  'payment_provider_connections',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    // "paystack" | "stripe"
    provider: text('provider').notNull(),

    /**
     * If you’re using API keys:
     * store ENCRYPTED values in your DB. (Encryption layer in app)
     */
    secretKeyEnc: text('secret_key_enc'),
    publicKeyEnc: text('public_key_enc'),

    /**
     * If you’re using OAuth later:
     */
    accessTokenEnc: text('access_token_enc'),
    refreshTokenEnc: text('refresh_token_enc'),

    // Provider account identifier (e.g., Paystack business ID) if you can fetch it
    providerAccountId: text('provider_account_id'),

    connectedAt: timestamp('connected_at', { mode: 'date' }),
    lastVerifiedAt: timestamp('last_verified_at', { mode: 'date' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('store_provider_connections_store_provider_unique').on(
      t.storeId,
      t.provider,
    ),
    index('idx_store_provider_connections_store_id').on(t.storeId),
  ],
);
