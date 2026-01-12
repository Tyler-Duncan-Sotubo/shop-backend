// src/drizzle/schema/storefront/storefront-configs.schema.ts
import {
  pgTable,
  uuid,
  jsonb,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { defaultId } from 'src/drizzle/id';
import { stores } from '../commerce/stores/stores.schema';
import { companies } from '../companies/companies.schema';

/* ---------------------------------- */
/* Status (draft vs published)        */
/* ---------------------------------- */
export const storefrontConfigStatus = pgEnum('storefront_config_status', [
  'draft',
  'published',
]);

/* ---------------------------------- */
/* 1) GLOBAL BASES (base includes theme) */
/* ---------------------------------- */
export const storefrontBases = pgTable(
  'storefront_bases',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),
    key: text('key').notNull(), // e.g. "default-v1"
    version: integer('version').notNull().default(1),

    theme: jsonb('theme').notNull().default({}),

    // structure + defaults
    ui: jsonb('ui').notNull().default({}),
    seo: jsonb('seo').notNull().default({}),
    header: jsonb('header').notNull().default({}),
    footer: jsonb('footer').notNull().default({}),
    pages: jsonb('pages').notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('uq_storefront_bases_key').on(t.key),
    index('idx_storefront_bases_active').on(t.isActive),
  ],
);

/* ---------------------------------- */
/* 2) THEMES (optional presets; scope by nullable company/store) */
/* ---------------------------------- */
/**
 * Themes can be:
 * - Global preset:    companyId NULL, storeId NULL
 * - Company preset:   companyId set,  storeId NULL
 * - Store preset:     companyId set,  storeId set
 *
 * This lets you ship platform themes and also override per tenant/store.
 */
export const storefrontThemes = pgTable(
  'storefront_themes',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    // ✅ null => global preset, set => company preset
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'cascade',
    }),

    key: text('key').notNull(), // e.g. "default", "minimal", "b2b"
    version: integer('version').notNull().default(1),

    // ✅ full preset config
    theme: jsonb('theme').notNull().default({}),
    ui: jsonb('ui').notNull().default({}),
    seo: jsonb('seo').notNull().default({}),
    header: jsonb('header').notNull().default({}),
    footer: jsonb('footer').notNull().default({}),
    pages: jsonb('pages').notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Global uniqueness: (key) where companyId IS NULL
    uniqueIndex('uq_storefront_themes_global_key')
      .on(t.key)
      .where(sql`${t.companyId} IS NULL`),

    // Company uniqueness: (companyId, key) where companyId IS NOT NULL
    uniqueIndex('uq_storefront_themes_company_key')
      .on(t.companyId, t.key)
      .where(sql`${t.companyId} IS NOT NULL`),

    index('idx_storefront_themes_company').on(t.companyId),
    index('idx_storefront_themes_active').on(t.isActive),
    index('idx_storefront_themes_key').on(t.key),
  ],
);

/* ---------------------------------- */
/* 3) STORE OVERRIDES (composition/content overrides) */
/* ---------------------------------- */
/**
 * Overrides reference:
 * - baseId (required)
 * - themeId (optional; if null, use base.theme)
 *
 * Overrides do NOT need a "theme" blob anymore (keep themes centralized).
 */
export const storefrontOverrides = pgTable(
  'storefront_overrides',
  {
    id: uuid('id').primaryKey().$defaultFn(defaultId),

    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),

    baseId: uuid('base_id')
      .notNull()
      .references(() => storefrontBases.id, { onDelete: 'restrict' }),

    themeId: uuid('theme_id').references(() => storefrontThemes.id, {
      onDelete: 'set null',
    }),

    theme: jsonb('theme').notNull().default({}),
    ui: jsonb('ui').notNull().default({}),
    seo: jsonb('seo').notNull().default({}),
    header: jsonb('header').notNull().default({}),
    footer: jsonb('footer').notNull().default({}),
    pages: jsonb('pages').notNull().default({}),

    status: storefrontConfigStatus('status').notNull().default('published'),
    publishedAt: timestamp('published_at', { mode: 'date' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // one draft + one published per store
    uniqueIndex('uq_storefront_overrides_store_status').on(t.storeId, t.status),

    index('idx_storefront_overrides_company').on(t.companyId),
    index('idx_storefront_overrides_store').on(t.storeId),
    index('idx_storefront_overrides_base').on(t.baseId),
    index('idx_storefront_overrides_theme').on(t.themeId),
  ],
);
