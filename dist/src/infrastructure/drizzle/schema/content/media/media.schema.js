"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.media = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../../companies/companies.schema");
const id_1 = require("../../../id");
const stores_schema_1 = require("../../commerce/stores/stores.schema");
exports.media = (0, pg_core_1.pgTable)('media', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    fileName: (0, pg_core_1.text)('file_name').notNull(),
    mimeType: (0, pg_core_1.text)('mime_type').notNull(),
    url: (0, pg_core_1.text)('url').notNull(),
    storageKey: (0, pg_core_1.text)('storage_key'),
    size: (0, pg_core_1.integer)('size'),
    width: (0, pg_core_1.integer)('width'),
    height: (0, pg_core_1.integer)('height'),
    altText: (0, pg_core_1.text)('alt_text'),
    folder: (0, pg_core_1.text)('folder'),
    tag: (0, pg_core_1.text)('tag'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { mode: 'date' }),
}, (table) => [
    (0, pg_core_1.index)('idx_media_company').on(table.companyId),
    (0, pg_core_1.index)('idx_media_folder').on(table.companyId, table.folder),
]);
//# sourceMappingURL=media.schema.js.map