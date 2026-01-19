import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { stores } from '../../commerce/stores/stores.schema';

export const bankTransferDetails = pgTable(
  'store_bank_transfer_details',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    accountName: text('account_name').notNull(),
    accountNumber: text('account_number').notNull(),
    bankName: text('bank_name').notNull(),

    // Optional: show additional instructions at checkout
    instructions: text('instructions'),

    // Optional: require customer to upload proof
    requireProof: boolean('require_proof').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('store_bank_transfer_details_store_unique').on(t.storeId),
    index('idx_store_bank_transfer_details_store_id').on(t.storeId),
  ],
);
