import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { defaultId } from 'src/infrastructure/drizzle/id';
import { companies } from '../../companies/companies.schema';
import { stores } from '../../commerce/stores/stores.schema';

export const analyticsIntegrations = pgTable(
  'analytics_integrations',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    /**
     * Provider identifier
     * Examples:
     * - ga4
     * - gtm
     * - meta_pixel
     * - tiktok_pixel
     */
    provider: varchar('provider', { length: 50 }).notNull(),

    /**
     * Public-facing identifiers
     * Safe to expose to storefront
     * e.g. { measurementId: "G-XXXX" }
     */
    publicConfig: jsonb('public_config').notNull().default({}),

    /**
     * Server-side or secret config
     * NEVER sent to client
     * e.g. api secrets, tokens
     */
    privateConfig: jsonb('private_config').notNull().default({}),

    /**
     * Master enable switch
     */
    enabled: boolean('enabled').notNull().default(true),

    /**
     * Optional consent / GDPR gating
     */
    requiresConsent: boolean('requires_consent').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_analytics_company_store_provider').on(
      table.companyId,
      table.storeId,
      table.provider,
    ),
    index('idx_analytics_company_store').on(table.companyId, table.storeId),
    index('idx_analytics_company_id').on(table.companyId),
  ],
);
