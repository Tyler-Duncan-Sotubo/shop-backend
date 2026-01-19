"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductDiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const schema_2 = require("../../../infrastructure/drizzle/schema");
const schema_3 = require("../../../infrastructure/drizzle/schema");
let ProductDiscoveryService = class ProductDiscoveryService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async listLatestStorefrontProducts(companyId, storeId, opts) {
        const limit = opts?.limit ?? 12;
        const offset = opts?.offset ?? 0;
        const search = opts?.search?.trim() || null;
        const cacheKey = [
            'catalog',
            'discovery',
            'latest',
            storeId,
            JSON.stringify({ limit, offset, search }),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const where = [
                (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId),
                (0, drizzle_orm_1.eq)(schema_1.products.status, 'active'),
                (0, drizzle_orm_1.isNull)(schema_1.products.deletedAt),
            ];
            if (search)
                where.push((0, drizzle_orm_1.sql) `${schema_1.products.name} ILIKE ${`%${search}%`}`);
            const idRows = await this.db
                .select({ id: schema_1.products.id })
                .from(schema_1.products)
                .where((0, drizzle_orm_1.and)(...where))
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.products.createdAt} DESC`)
                .limit(limit)
                .offset(offset)
                .execute();
            return this.hydrateStorefrontRows(companyId, storeId, idRows.map((r) => r.id));
        });
    }
    async listOnSaleStorefrontProducts(companyId, storeId, opts) {
        const limit = opts?.limit ?? 12;
        const offset = opts?.offset ?? 0;
        const search = opts?.search?.trim() || null;
        const cacheKey = [
            'catalog',
            'discovery',
            'onSale',
            storeId,
            JSON.stringify({ limit, offset, search }),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const where = [
                (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId),
                (0, drizzle_orm_1.eq)(schema_1.products.status, 'active'),
                (0, drizzle_orm_1.isNull)(schema_1.products.deletedAt),
                (0, drizzle_orm_1.sql) `EXISTS (
          SELECT 1
          FROM ${schema_1.productVariants} v
          WHERE v.company_id = ${companyId}
            AND v.product_id = ${schema_1.products.id}
            AND v.deleted_at IS NULL
            AND v.is_active = true
            AND v.sale_price > 0
            AND v.regular_price > 0
            AND v.sale_price < v.regular_price
        )`,
            ];
            if (search)
                where.push((0, drizzle_orm_1.sql) `${schema_1.products.name} ILIKE ${`%${search}%`}`);
            const idRows = await this.db
                .select({ id: schema_1.products.id })
                .from(schema_1.products)
                .where((0, drizzle_orm_1.and)(...where))
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.products.createdAt} DESC`)
                .limit(limit)
                .offset(offset)
                .execute();
            return this.hydrateStorefrontRows(companyId, storeId, idRows.map((r) => r.id));
        });
    }
    async listBestSellerStorefrontProducts(companyId, storeId, opts) {
        const limit = opts?.limit ?? 12;
        const offset = opts?.offset ?? 0;
        const windowDays = opts?.windowDays ?? 30;
        const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
        const cacheKey = [
            'catalog',
            'discovery',
            'bestSellers',
            storeId,
            JSON.stringify({ limit, offset, windowDays }),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const productIdExpr = (0, drizzle_orm_1.sql) `COALESCE(${schema_3.orderItems.productId}, ${schema_1.productVariants.productId})`;
            const rows = await this.db
                .select({
                productId: productIdExpr,
                units: (0, drizzle_orm_1.sql) `SUM(${schema_3.orderItems.quantity})`,
            })
                .from(schema_3.orderItems)
                .innerJoin(schema_2.orders, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_2.orders.id, schema_3.orderItems.orderId), (0, drizzle_orm_1.eq)(schema_2.orders.companyId, companyId), (0, drizzle_orm_1.eq)(schema_2.orders.storeId, storeId), (0, drizzle_orm_1.sql) `${schema_2.orders.paidAt} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_2.orders.createdAt} >= ${since}`))
                .leftJoin(schema_1.productVariants, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, schema_3.orderItems.variantId), (0, drizzle_orm_1.isNull)(schema_1.productVariants.deletedAt)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_3.orderItems.companyId, companyId), (0, drizzle_orm_1.sql) `${productIdExpr} IS NOT NULL`))
                .groupBy(productIdExpr)
                .orderBy((0, drizzle_orm_1.sql) `SUM(${schema_3.orderItems.quantity}) DESC`)
                .limit(limit)
                .offset(offset)
                .execute();
            const productIds = rows
                .map((r) => r.productId)
                .filter(Boolean);
            return this.hydrateStorefrontRows(companyId, storeId, productIds);
        });
    }
    async hydrateStorefrontRows(companyId, storeId, productIds) {
        if (!productIds.length)
            return [];
        const baseRows = await this.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            slug: schema_1.products.slug,
            imageUrl: schema_1.productImages.url,
        })
            .from(schema_1.products)
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId), (0, drizzle_orm_1.inArray)(schema_1.products.id, productIds), (0, drizzle_orm_1.eq)(schema_1.products.status, 'active'), (0, drizzle_orm_1.isNull)(schema_1.products.deletedAt)))
            .execute();
        const baseById = new Map(baseRows.map((r) => [r.id, r]));
        const priceRows = await this.db
            .select({
            productId: schema_1.productVariants.productId,
            minPrice: (0, drizzle_orm_1.sql) `MIN(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
            maxPrice: (0, drizzle_orm_1.sql) `MAX(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
            minSalePrice: (0, drizzle_orm_1.sql) `
          MIN(
            CASE
              WHEN NULLIF(${schema_1.productVariants.salePrice}, 0) IS NOT NULL
               AND NULLIF(${schema_1.productVariants.regularPrice}, 0) IS NOT NULL
               AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
              THEN ${schema_1.productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
            maxSalePrice: (0, drizzle_orm_1.sql) `
          MAX(
            CASE
              WHEN NULLIF(${schema_1.productVariants.salePrice}, 0) IS NOT NULL
               AND NULLIF(${schema_1.productVariants.regularPrice}, 0) IS NOT NULL
               AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
              THEN ${schema_1.productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
        })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds), (0, drizzle_orm_1.isNull)(schema_1.productVariants.deletedAt), (0, drizzle_orm_1.eq)(schema_1.productVariants.isActive, true)))
            .groupBy(schema_1.productVariants.productId)
            .execute();
        const priceByProductId = new Map();
        for (const r of priceRows) {
            priceByProductId.set(r.productId, {
                minPrice: r.minPrice == null ? null : Number(r.minPrice),
                maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
                minSalePrice: r.minSalePrice == null ? null : Number(r.minSalePrice),
                maxSalePrice: r.maxSalePrice == null ? null : Number(r.maxSalePrice),
            });
        }
        const ratingRows = await this.db
            .select({
            productId: schema_1.productReviews.productId,
            ratingCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            averageRating: (0, drizzle_orm_1.sql) `
          COALESCE(ROUND(AVG(${schema_1.productReviews.rating})::numeric, 2), 0)
        `,
        })
            .from(schema_1.productReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productReviews.productId, productIds), (0, drizzle_orm_1.eq)(schema_1.productReviews.isApproved, true), (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`))
            .groupBy(schema_1.productReviews.productId)
            .execute();
        const ratingsByProductId = new Map();
        for (const r of ratingRows) {
            ratingsByProductId.set(r.productId, {
                ratingCount: Number(r.ratingCount ?? 0),
                averageRating: Number(r.averageRating ?? 0),
            });
        }
        const catRows = await this.db
            .select({
            productId: schema_1.productCategories.productId,
            categoryId: schema_1.categories.id,
            categoryName: schema_1.categories.name,
        })
            .from(schema_1.productCategories)
            .innerJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.productCategories.companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productCategories.productId, productIds)))
            .execute();
        const catsByProductId = new Map();
        for (const r of catRows) {
            const list = catsByProductId.get(r.productId) ?? [];
            list.push({ id: r.categoryId, name: r.categoryName });
            catsByProductId.set(r.productId, list);
        }
        const out = [];
        for (const id of productIds) {
            const base = baseById.get(id);
            if (!base)
                continue;
            const price = priceByProductId.get(id) ?? {
                minPrice: null,
                maxPrice: null,
                minSalePrice: null,
                maxSalePrice: null,
            };
            const rating = ratingsByProductId.get(id) ?? {
                ratingCount: 0,
                averageRating: 0,
            };
            out.push({
                id: base.id,
                name: base.name,
                slug: base.slug,
                imageUrl: base.imageUrl ?? null,
                minPrice: price.minPrice,
                maxPrice: price.maxPrice,
                minSalePrice: price.minSalePrice,
                maxSalePrice: price.maxSalePrice,
                ratingCount: rating.ratingCount,
                averageRating: rating.averageRating,
                categories: catsByProductId.get(id) ?? [],
            });
        }
        return out;
    }
};
exports.ProductDiscoveryService = ProductDiscoveryService;
exports.ProductDiscoveryService = ProductDiscoveryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], ProductDiscoveryService);
//# sourceMappingURL=product-discovery.service.js.map