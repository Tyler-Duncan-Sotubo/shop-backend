import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { companies } from '../../companies/companies.schema';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { stores } from '../../commerce/stores/stores.schema';

export const zohoConnections = pgTable(
  'zoho_connections',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    // OAuth credentials
    refreshToken: text('refresh_token').notNull(),
    accessToken: text('access_token'), // optional, short lived
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'date',
    }),

    // Zoho org info
    zohoOrganizationId: text('zoho_organization_id'),
    zohoOrganizationName: text('zoho_organization_name'),

    // Region support (.com / .eu / .in etc)
    region: text('region').notNull().default('com'),

    // Connection state
    isActive: boolean('is_active').notNull().default(true),
    lastSyncedAt: timestamp('last_synced_at', { mode: 'date' }),
    lastError: text('last_error'),

    connectedAt: timestamp('connected_at', { mode: 'date' })
      .notNull()
      .defaultNow(),

    disconnectedAt: timestamp('disconnected_at', { mode: 'date' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_zoho_connections_company_store').on(
      table.companyId,
      table.storeId,
    ),

    uniqueIndex('uq_zoho_connections_store').on(table.storeId),
  ],
);
