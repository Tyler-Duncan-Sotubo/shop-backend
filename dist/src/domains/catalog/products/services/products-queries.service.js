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
exports.ProductsQueriesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
let ProductsQueriesService = class ProductsQueriesService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async listProductsAdmin(companyId, query) {
        const { search, status, storeId, limit = 50, offset = 0 } = query;
        return this.cache.getOrSetVersioned(companyId, [
            'catalog',
            'products',
            'admin',
            JSON.stringify({
                storeId: storeId ?? null,
                search: search ?? null,
                status: status ?? null,
                limit,
                offset,
            }),
        ], async () => {
            const effectiveStatus = status ?? 'active';
            const whereClauses = [
                (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.products.status, effectiveStatus),
            ];
            if (storeId)
                whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId));
            if (status === 'archived')
                whereClauses.push((0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NOT NULL`);
            else
                whereClauses.push((0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`);
            if (search)
                whereClauses.push((0, drizzle_orm_1.ilike)(schema_1.products.name, `%${search}%`));
            const [{ count: basicCount }] = await this.db
                .select({ count: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.products.id})` })
                .from(schema_1.products)
                .where((0, drizzle_orm_1.and)(...whereClauses))
                .execute();
            const total = Number(basicCount) || 0;
            const items = await this.listProducts(companyId, storeId ?? '', query);
            const productIds = items.map((p) => p.id).filter(Boolean);
            if (!productIds.length)
                return { items, total, limit, offset };
            const variantRows = await this.db
                .select({
                productId: schema_1.productVariants.productId,
                variantCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            })
                .from(schema_1.productVariants)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds), (0, drizzle_orm_1.sql) `${schema_1.productVariants.deletedAt} IS NULL`))
                .groupBy(schema_1.productVariants.productId)
                .execute();
            const variantCountByProductId = new Map();
            for (const r of variantRows) {
                variantCountByProductId.set(r.productId, Number(r.variantCount ?? 0));
            }
            const itemsWithVariantCount = items.map((p) => ({
                ...p,
                variantCount: variantCountByProductId.get(p.id) ?? 0,
            }));
            return { items: itemsWithVariantCount, total, limit, offset };
        });
    }
    async listProducts(companyId, storeId, query) {
        const { search, status, categoryId, limit = 50, offset = 0 } = query;
        return this.cache.getOrSetVersioned(companyId, [
            'catalog',
            'products',
            JSON.stringify({
                storeId: storeId || null,
                search: search ?? null,
                status: status ?? null,
                categoryId: categoryId ?? null,
                limit,
                offset,
            }),
        ], async () => {
            const effectiveStatus = status ?? 'active';
            const whereClauses = [
                (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
                (0, drizzle_orm_1.eq)(schema_1.products.status, effectiveStatus),
            ];
            if (storeId)
                whereClauses.push((0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId));
            if (status === 'archived')
                whereClauses.push((0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NOT NULL`);
            else
                whereClauses.push((0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`);
            if (search)
                whereClauses.push((0, drizzle_orm_1.ilike)(schema_1.products.name, `%${search}%`));
            let pageQuery = this.db
                .select({
                id: schema_1.products.id,
                name: schema_1.products.name,
                createdAt: schema_1.products.createdAt,
                status: schema_1.products.status,
                slug: schema_1.products.slug,
                imageUrl: schema_1.productImages.url,
            })
                .from(schema_1.products)
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)));
            if (categoryId) {
                pageQuery = pageQuery
                    .innerJoin(schema_1.productCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, schema_1.products.id), (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, categoryId)))
                    .innerJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId)));
            }
            const page = await pageQuery
                .where((0, drizzle_orm_1.and)(...whereClauses))
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.products.createdAt} DESC`)
                .limit(limit)
                .offset(offset)
                .execute();
            if (!page.length)
                return [];
            const productIds = page.map((p) => p.id);
            const rangeLabel = (min, max) => {
                if (min == null && max == null)
                    return null;
                if (min != null && max != null)
                    return min === max ? `${min}` : `${min} - ${max}`;
                return `${min ?? max}`;
            };
            const stockPriceRows = await this.db
                .select({
                productId: schema_1.productVariants.productId,
                stock: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.inventoryItems.available}), 0)`,
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
                .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, schema_1.productVariants.id)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds)))
                .groupBy(schema_1.productVariants.productId)
                .execute();
            const stockPriceByProduct = new Map();
            for (const r of stockPriceRows) {
                stockPriceByProduct.set(r.productId, {
                    stock: Number(r.stock ?? 0),
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
            const ratingsByProduct = new Map();
            for (const r of ratingRows) {
                ratingsByProduct.set(r.productId, {
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
                .innerJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.productCategories.companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productCategories.productId, productIds)))
                .execute();
            const catsByProduct = new Map();
            for (const r of catRows) {
                const list = catsByProduct.get(r.productId) ?? [];
                list.push({ id: r.categoryId, name: r.categoryName });
                catsByProduct.set(r.productId, list);
            }
            return page.map((p) => {
                const sp = stockPriceByProduct.get(p.id) ?? {
                    stock: 0,
                    minPrice: null,
                    maxPrice: null,
                    minSalePrice: null,
                    maxSalePrice: null,
                };
                const regularMin = sp.minPrice;
                const regularMax = sp.maxPrice;
                const saleMin = sp.minSalePrice;
                const saleMax = sp.maxSalePrice;
                const regularLabel = rangeLabel(regularMin, regularMax);
                const saleLabel = rangeLabel(saleMin, saleMax);
                const onSale = sp.minSalePrice != null;
                const price_html = onSale && regularLabel && saleLabel
                    ? `<del>${regularLabel}</del> <ins>${saleLabel}</ins>`
                    : (regularLabel ?? '');
                return {
                    id: p.id,
                    name: p.name,
                    createdAt: p.createdAt,
                    status: p.status,
                    slug: p.slug,
                    imageUrl: p.imageUrl ?? null,
                    stock: sp.stock,
                    regular_price: sp.minPrice != null ? String(sp.minPrice) : null,
                    sale_price: onSale && sp.minSalePrice != null
                        ? String(sp.minSalePrice)
                        : null,
                    on_sale: onSale,
                    price: String(onSale ? sp.minSalePrice : (sp.minPrice ?? 0)),
                    price_html,
                    minPrice: regularMin,
                    maxPrice: regularMax,
                    minSalePrice: saleMin,
                    maxSalePrice: saleMax,
                    categories: catsByProduct.get(p.id) ?? [],
                    ratingCount: ratingsByProduct.get(p.id)?.ratingCount ?? 0,
                    averageRating: ratingsByProduct.get(p.id)?.averageRating ?? 0,
                };
            });
        });
    }
    async listProductsWithRelations(companyId, opts) {
        const limit = opts?.limit ?? 50;
        const offset = opts?.offset ?? 0;
        return this.db.query.products.findMany({
            where: (fields, { eq }) => eq(fields.companyId, companyId),
            with: {
                variants: true,
                options: { with: { values: true } },
                images: true,
                productCategories: { with: { category: true } },
                defaultVariant: true,
            },
            limit,
            offset,
            orderBy: (fields, { desc }) => desc(fields.createdAt),
        });
    }
    async getProductWithRelationsBySlug(companyId, slug) {
        const product = await this.db.query.products.findFirst({
            where: (fields, { and, eq, isNull }) => and(eq(fields.slug, slug), eq(fields.companyId, companyId), eq(fields.status, 'active'), isNull(fields.deletedAt)),
            with: {
                defaultImage: true,
                variants: { with: { image: true } },
                options: { with: { values: true } },
                images: true,
                productCategories: { with: { category: true } },
                defaultVariant: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Active product with slug "${slug}" not found`);
        }
        const pcs = product.productCategories ?? [];
        const cats = pcs.map((pc) => pc.category).filter(Boolean);
        if (cats.length > 1) {
            const catById = new Map(cats.map((c) => [c.id, c]));
            const childWithParent = cats.find((c) => c.parentId && catById.has(c.parentId));
            if (childWithParent?.parentId) {
                const parentId = childWithParent.parentId;
                const childId = childWithParent.id;
                const pcByCatId = new Map(pcs.filter((pc) => pc.category).map((pc) => [pc.category.id, pc]));
                const parentPc = pcByCatId.get(parentId);
                const childPc = pcByCatId.get(childId);
                const rest = pcs.filter((pc) => pc.category?.id !== parentId && pc.category?.id !== childId);
                const reordered = [];
                if (parentPc)
                    reordered.push(parentPc);
                if (childPc)
                    reordered.push(childPc);
                reordered.push(...rest);
                product.productCategories = reordered;
            }
        }
        const [r] = await this.db
            .select({
            ratingCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            averageRating: (0, drizzle_orm_1.sql) `
          COALESCE(ROUND(AVG(${schema_1.productReviews.rating})::numeric, 2), 0)
        `,
        })
            .from(schema_1.productReviews)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productReviews.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productReviews.productId, product.id), (0, drizzle_orm_1.eq)(schema_1.productReviews.isApproved, true), (0, drizzle_orm_1.sql) `${schema_1.productReviews.deletedAt} IS NULL`))
            .execute();
        return {
            ...product,
            rating_count: Number(r?.ratingCount ?? 0),
            average_rating: Number(r?.averageRating ?? 0),
        };
    }
};
exports.ProductsQueriesService = ProductsQueriesService;
exports.ProductsQueriesService = ProductsQueriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], ProductsQueriesService);
//# sourceMappingURL=products-queries.service.js.map