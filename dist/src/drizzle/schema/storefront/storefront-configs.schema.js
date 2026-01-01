"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storefrontConfigs = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const stores_schema_1 = require("../stores/stores.schema");
const id_1 = require("../../id");
exports.storefrontConfigs = (0, pg_core_1.pgTable)('storefront_configs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    storeId: (0, pg_core_1.uuid)('store_id')
        .notNull()
        .references(() => stores_schema_1.stores.id, { onDelete: 'cascade' }),
    theme: (0, pg_core_1.jsonb)('theme').notNull().default({}),
    header: (0, pg_core_1.jsonb)('header').notNull().default({}),
    pages: (0, pg_core_1.jsonb)('pages').notNull().default({}),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
    (0, pg_core_1.uniqueIndex)('uq_storefront_configs_store_id').on(t.storeId),
    (0, pg_core_1.index)('idx_storefront_configs_store_id').on(t.storeId),
]);
//# sourceMappingURL=storefront-configs.schema.js.map