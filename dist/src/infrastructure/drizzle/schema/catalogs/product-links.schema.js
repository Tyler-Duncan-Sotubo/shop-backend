"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productLinks = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const companies_schema_1 = require("../companies/companies.schema");
const products_schema_1 = require("./products.schema");
const enum_schema_1 = require("../enum.schema");
const id_1 = require("../../id");
exports.productLinks = (0, pg_core_1.pgTable)('product_links', {
    id: (0, pg_core_1.uuid)('id').primaryKey().$defaultFn(id_1.defaultId),
    companyId: (0, pg_core_1.uuid)('company_id')
        .notNull()
        .references(() => companies_schema_1.companies.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    linkedProductId: (0, pg_core_1.uuid)('linked_product_id')
        .notNull()
        .references(() => products_schema_1.products.id, { onDelete: 'cascade' }),
    linkType: (0, enum_schema_1.productLinkTypeEnum)('link_type').notNull().default('related'),
    position: (0, pg_core_1.integer)('position').notNull().default(1),
    createdAt: (0, pg_core_1.timestamp)('created_at', { mode: 'date' }).notNull().defaultNow(),
}, (table) => [
    (0, pg_core_1.uniqueIndex)('product_links_unique').on(table.companyId, table.productId, table.linkedProductId, table.linkType),
]);
//# sourceMappingURL=product-links.schema.js.map