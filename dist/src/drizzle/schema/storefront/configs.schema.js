"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storefrontOverrides = exports.storefrontThemes = exports.storefrontBases = exports.storefrontConfigStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const id_1 = require("../../id");
const stores_schema_1 = require("../commerce/stores/stores.schema");
const companies_schema_1 = require("../companies/companies.schema");
exports.storefrontConfigStatus = (0, pg_core_1.pgEnum)('storefront_config_status', [
    'draft',
    'published',
]);
exports.storefrontBases = (0, pg_core_1.pgTable)('storefront_bases', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    key: (0, pg_core_1.text)('key').notNull(),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    theme: (0, pg_core_1.jsonb)('theme').notNull().default({}),
    ui: (0, pg_core_1.jsonb)('ui').notNull().default({}),
    seo: (0, pg_core_1.jsonb)('seo').notNull().default({}),
    header: (0, pg_core_1.jsonb)('header').notNull().default({}),
    footer: (0, pg_core_1.jsonb)('footer').notNull().default({}),
    pages: (0, pg_core_1.jsonb)('pages').notNull().default({}),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_storefront_bases_key').on(t.key),
    (0, pg_core_1.index)('idx_storefront_bases_active').on(t.isActive),
]);
exports.storefrontThemes = (0, pg_core_1.pgTable)('storefront_themes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id').references(() => companies_schema_1.companies.id, {
        onDelete: 'cascade',
    }),
    key: (0, pg_core_1.text)('key').notNull(),
    version: (0, pg_core_1.integer)('version').notNull().default(1),
    theme: (0, pg_core_1.jsonb)('theme').notNull().default({}),
    ui: (0, pg_core_1.jsonb)('ui').notNull().default({}),
    seo: (0, pg_core_1.jsonb)('seo').notNull().default({}),
    header: (0, pg_core_1.jsonb)('header').notNull().default({}),
    footer: (0, pg_core_1.jsonb)('footer').notNull().default({}),
    pages: (0, pg_core_1.jsonb)('pages').notNull().default({}),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_storefront_themes_global_key')
        .on(t.key)
        .where((0, drizzle_orm_1.sql) `${t.companyId} IS NULL`),
    (0, pg_core_1.uniqueIndex)('uq_storefront_themes_company_key')
        .on(t.companyId, t.key)
        .where((0, drizzle_orm_1.sql) `${t.companyId} IS NOT NULL`),
    (0, pg_core_1.index)('idx_storefront_themes_company').on(t.companyId),
    (0, pg_core_1.index)('idx_storefront_themes_active').on(t.isActive),
    (0, pg_core_1.index)('idx_storefront_themes_key').on(t.key),
]);
exports.storefrontOverrides = (0, pg_core_1.pgTable)('storefront_overrides', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    baseId: (0, pg_core_1.uuid)('base_id')
        .notNull()
        .references(() => exports.storefrontBases.id, { onDelete: 'restrict' }),
    themeId: (0, pg_core_1.uuid)('theme_id').references(() => exports.storefrontThemes.id, {
        onDelete: 'set null',
    }),
    theme: (0, pg_core_1.jsonb)('theme').notNull().default({}),
    ui: (0, pg_core_1.jsonb)('ui').notNull().default({}),
    seo: (0, pg_core_1.jsonb)('seo').notNull().default({}),
    header: (0, pg_core_1.jsonb)('header').notNull().default({}),
    footer: (0, pg_core_1.jsonb)('footer').notNull().default({}),
    pages: (0, pg_core_1.jsonb)('pages').notNull().default({}),
    status: (0, exports.storefrontConfigStatus)('status').notNull().default('published'),
    publishedAt: (0, pg_core_1.timestamp)('published_at', { mode: 'date' }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_storefront_overrides_store_status').on(t.storeId, t.status),
    (0, pg_core_1.index)('idx_storefront_overrides_company').on(t.companyId),
    (0, pg_core_1.index)('idx_storefront_overrides_store').on(t.storeId),
    (0, pg_core_1.index)('idx_storefront_overrides_base').on(t.baseId),
    (0, pg_core_1.index)('idx_storefront_overrides_theme').on(t.themeId),
]);
//# sourceMappingURL=configs.schema.js.map