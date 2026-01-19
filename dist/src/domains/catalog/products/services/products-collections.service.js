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
exports.ProductsCollectionsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const product_mapper_1 = require("../../mappers/product.mapper");
let ProductsCollectionsService = class ProductsCollectionsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
    }
    async getCategoryAndDescendantIds(companyId, storeId, categoryId) {
        const res = await this.db.execute((0, drizzle_orm_1.sql) `
      WITH RECURSIVE subcats AS (
        SELECT id
        FROM ${schema_1.categories}
        WHERE company_id = ${companyId}
          AND store_id = ${storeId}
          AND id = ${categoryId}
          AND deleted_at IS NULL

        UNION ALL

        SELECT c.id
        FROM ${schema_1.categories} c
        JOIN subcats s ON c.parent_id = s.id
        WHERE c.company_id = ${companyId}
          AND c.store_id = ${storeId}
          AND c.deleted_at IS NULL
      )
      SELECT id FROM subcats
    `);
        const ids = res.rows?.map((r) => r.id) ?? [categoryId];
        return ids;
    }
    async listCollectionProductsByCategorySlug(companyId, storeId, categorySlug, query) {
        const { search, status, limit = 12, offset = 0 } = query;
        const effectiveStatus = status ?? 'active';
        const attr = query.attr ?? {};
        const stableAttr = Object.fromEntries(Object.entries(attr)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]));
        const cacheKey = [
            'catalog',
            'collections',
            'products',
            'byCategorySlug',
            storeId,
            categorySlug,
            JSON.stringify({
                search: search ?? null,
                status: effectiveStatus,
                limit,
                offset,
                attr: stableAttr,
            }),
        ];
        return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
            const [category] = await this.db
                .select({
                id: schema_1.categories.id,
                name: schema_1.categories.name,
                slug: schema_1.categories.slug,
                description: schema_1.categories.description,
                afterContentHtml: schema_1.categories.afterContentHtml,
                metaTitle: schema_1.categories.metaTitle,
                metaDescription: schema_1.categories.metaDescription,
                imageUrl: schema_1.media.url,
                imageAltText: schema_1.media.altText,
            })
                .from(schema_1.categories)
                .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.slug, categorySlug), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
                .limit(1)
                .execute();
            if (!category)
                return { category: null, products: [] };
            const categoryForResponse = {
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description ?? null,
                afterContentHtml: category.afterContentHtml ?? null,
                metaTitle: category.metaTitle ?? null,
                metaDescription: category.metaDescription ?? null,
                imageUrl: category.imageUrl ?? null,
                imageAltText: category.imageAltText ?? null,
            };
            const hasChild = await this.db.query.categories.findFirst({
                where: (c, { and, eq, isNull }) => and(eq(c.companyId, companyId), eq(c.storeId, storeId), eq(c.parentId, category.id), isNull(c.deletedAt)),
                columns: { id: true },
            });
            const categoryIds = hasChild
                ? await this.getCategoryAndDescendantIds(companyId, storeId, category.id)
                : [category.id];
            const whereSql = [
                (0, drizzle_orm_1.sql) `${schema_1.products.companyId} = ${companyId}`,
                (0, drizzle_orm_1.sql) `${schema_1.products.storeId} = ${storeId}`,
                (0, drizzle_orm_1.sql) `${schema_1.products.status} = ${effectiveStatus}`,
                (0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`,
                (0, drizzle_orm_1.sql) `EXISTS (
          SELECT 1 FROM ${schema_1.productCategories} pc
          WHERE pc.company_id = ${companyId}
            AND pc.product_id = ${schema_1.products.id}
            AND pc.category_id IN (${drizzle_orm_1.sql.join(categoryIds.map((id) => (0, drizzle_orm_1.sql) `${id}`), (0, drizzle_orm_1.sql) `, `)})
        )`,
            ];
            if (search)
                whereSql.push((0, drizzle_orm_1.sql) `${schema_1.products.name} ILIKE ${`%${search}%`}`);
            for (const [attrName, attrValue] of Object.entries(attr)) {
                const values = Array.isArray(attrValue) ? attrValue : [attrValue];
                whereSql.push((0, drizzle_orm_1.sql) `
          EXISTS (
            SELECT 1
            FROM ${schema_1.productOptions} po
            JOIN ${schema_1.productOptionValues} pov
              ON pov.company_id = po.company_id
             AND pov.product_option_id = po.id
            WHERE po.company_id = ${companyId}
              AND po.product_id = ${schema_1.products.id}
              AND po.name = ${attrName}
              AND pov.value IN (${drizzle_orm_1.sql.join(values.map((v) => (0, drizzle_orm_1.sql) `${v}`), (0, drizzle_orm_1.sql) `, `)})
          )
        `);
            }
            const idRows = await this.db
                .select({ id: schema_1.products.id })
                .from(schema_1.products)
                .where((0, drizzle_orm_1.sql) `${drizzle_orm_1.sql.join(whereSql, (0, drizzle_orm_1.sql) ` AND `)}`)
                .orderBy((0, drizzle_orm_1.sql) `${schema_1.products.createdAt} DESC`)
                .limit(limit)
                .offset(offset)
                .execute();
            const productIds = idRows.map((r) => r.id);
            if (!productIds.length)
                return { category: categoryForResponse, products: [] };
            const fullProducts = await this.db.query.products.findMany({
                where: (p, { and, eq, inArray, isNull }) => and(eq(p.companyId, companyId), eq(p.storeId, storeId), inArray(p.id, productIds), isNull(p.deletedAt)),
                with: {
                    defaultImage: true,
                    images: true,
                    options: { with: { values: true } },
                    productCategories: { with: { category: true } },
                },
            });
            const fullById = new Map(fullProducts.map((p) => [p.id, p]));
            const ordered = productIds
                .map((id) => fullById.get(id))
                .filter(Boolean);
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
                    rating_count: Number(r.ratingCount ?? 0),
                    average_rating: Number(r.averageRating ?? 0),
                });
            }
            const priceRows = await this.db
                .select({
                productId: schema_1.productVariants.productId,
                minRegular: (0, drizzle_orm_1.sql) `MIN(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
                maxRegular: (0, drizzle_orm_1.sql) `MAX(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
                minSale: (0, drizzle_orm_1.sql) `
            MIN(
              CASE
                WHEN ${schema_1.productVariants.salePrice} > 0
                 AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
                THEN ${schema_1.productVariants.salePrice}
                ELSE NULL
              END
            )
          `,
                onSale: (0, drizzle_orm_1.sql) `
            CASE
              WHEN SUM(
                CASE
                  WHEN ${schema_1.productVariants.salePrice} > 0
                   AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
                  THEN 1 ELSE 0
                END
              ) > 0 THEN 1 ELSE 0
            END
          `,
            })
                .from(schema_1.productVariants)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds), (0, drizzle_orm_1.sql) `${schema_1.productVariants.deletedAt} IS NULL`, (0, drizzle_orm_1.eq)(schema_1.productVariants.isActive, true)))
                .groupBy(schema_1.productVariants.productId)
                .execute();
            const priceByProduct = new Map();
            for (const r of priceRows) {
                priceByProduct.set(r.productId, {
                    minRegular: Number(r.minRegular ?? 0),
                    maxRegular: Number(r.maxRegular ?? r.minRegular ?? 0),
                    minSale: Number(r.minSale ?? 0),
                    onSale: Number(r.onSale) === 1,
                });
            }
            const productsList = ordered.map((p) => {
                const ratings = ratingsByProduct.get(p.id) ?? {
                    rating_count: 0,
                    average_rating: 0,
                };
                const price = priceByProduct.get(p.id) ?? {
                    minRegular: 0,
                    maxRegular: 0,
                    minSale: 0,
                    onSale: false,
                };
                return (0, product_mapper_1.mapProductToCollectionListResponse)({
                    ...p,
                    rating_count: ratings.rating_count,
                    average_rating: ratings.average_rating,
                    ...price,
                });
            });
            return { category: categoryForResponse, products: productsList };
        });
    }
    async listProductsGroupedUnderParentCategory(companyId, storeId, parentCategoryId, query) {
        const { status, search, limit = 8, offset = 0 } = query;
        const effectiveStatus = status ?? 'active';
        const parent = await this.db
            .select({
            id: schema_1.categories.id,
            name: schema_1.categories.name,
            slug: schema_1.categories.slug,
            description: schema_1.categories.description,
            imageUrl: schema_1.media.url,
            imageAltText: schema_1.media.altText,
            afterContentHtml: schema_1.categories.afterContentHtml,
            metaTitle: schema_1.categories.metaTitle,
            metaDescription: schema_1.categories.metaDescription,
        })
            .from(schema_1.categories)
            .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.id, parentCategoryId), (0, drizzle_orm_1.sql) `${schema_1.categories.deletedAt} IS NULL`))
            .limit(1)
            .execute()
            .then((r) => r[0]);
        if (!parent?.id)
            return { parent: null, groups: [], exploreMore: [] };
        const childCats = await this.db
            .select({
            id: schema_1.categories.id,
            name: schema_1.categories.name,
            slug: schema_1.categories.slug,
            description: schema_1.categories.description,
            imageUrl: schema_1.media.url,
            imageAltText: schema_1.media.altText,
            afterContentHtml: schema_1.categories.afterContentHtml,
        })
            .from(schema_1.categories)
            .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.parentId, parentCategoryId), (0, drizzle_orm_1.sql) `${schema_1.categories.deletedAt} IS NULL`))
            .orderBy(schema_1.categories.name)
            .execute();
        const childCatIds = childCats.map((c) => c.id);
        const exploreMore = await this.db
            .select({
            id: schema_1.categories.id,
            name: schema_1.categories.name,
            slug: schema_1.categories.slug,
            imageUrl: schema_1.media.url,
        })
            .from(schema_1.categories)
            .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.sql) `${schema_1.categories.deletedAt} IS NULL`, (0, drizzle_orm_1.isNotNull)(schema_1.media.url), (0, drizzle_orm_1.sql) `${schema_1.categories.id} <> ${parentCategoryId}`, childCatIds.length
            ? (0, drizzle_orm_1.sql) `${schema_1.categories.id} NOT IN (${drizzle_orm_1.sql.join(childCatIds.map((id) => (0, drizzle_orm_1.sql) `${id}`), (0, drizzle_orm_1.sql) `, `)})`
            : (0, drizzle_orm_1.sql) `TRUE`, (0, drizzle_orm_1.sql) `${schema_1.categories.parentId} <> ${parentCategoryId}`))
            .orderBy((0, drizzle_orm_1.sql) `RANDOM()`)
            .limit(3)
            .execute();
        if (!childCats.length)
            return { parent, groups: [], exploreMore };
        const productRows = await this.db.execute((0, drizzle_orm_1.sql) `
      WITH ranked AS (
        SELECT
          pc.category_id AS category_id,
          p.id           AS product_id,
          ROW_NUMBER() OVER (
            PARTITION BY pc.category_id
            ORDER BY p.created_at DESC
          ) AS rn
        FROM ${schema_1.productCategories} pc
        JOIN ${schema_1.products} p
          ON p.company_id = pc.company_id
         AND p.id = pc.product_id
        WHERE pc.company_id = ${companyId}
          AND pc.category_id IN (${drizzle_orm_1.sql.join(childCatIds.map((id) => (0, drizzle_orm_1.sql) `${id}`), (0, drizzle_orm_1.sql) `, `)})
          AND p.store_id = ${storeId}
          AND p.status = ${effectiveStatus}
          AND p.deleted_at IS NULL
          ${search ? (0, drizzle_orm_1.sql) `AND p.name ILIKE ${`%${search}%`}` : (0, drizzle_orm_1.sql) ``}
      )
      SELECT category_id, product_id
      FROM ranked
      WHERE rn > ${offset} AND rn <= ${offset + limit}
    `);
        const pairs = (productRows.rows ?? []);
        if (!pairs.length) {
            return {
                parent,
                groups: childCats.map((c) => ({ category: c, products: [] })),
                exploreMore,
            };
        }
        const productIds = [...new Set(pairs.map((x) => x.product_id))];
        const base = await this.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            slug: schema_1.products.slug,
            createdAt: schema_1.products.createdAt,
            status: schema_1.products.status,
            imageUrl: schema_1.productImages.url,
        })
            .from(schema_1.products)
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId), (0, drizzle_orm_1.inArray)(schema_1.products.id, productIds)))
            .execute();
        const baseById = new Map(base.map((p) => [p.id, p]));
        const stockPriceRows = await this.db
            .select({
            productId: schema_1.productVariants.productId,
            stock: (0, drizzle_orm_1.sql) `COALESCE(SUM(${schema_1.inventoryItems.available}), 0)`,
            minPrice: (0, drizzle_orm_1.sql) `MIN(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
            maxPrice: (0, drizzle_orm_1.sql) `MAX(NULLIF(${schema_1.productVariants.regularPrice}, 0))`,
            minSale: (0, drizzle_orm_1.sql) `
          MIN(
            CASE
              WHEN ${schema_1.productVariants.salePrice} > 0
               AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
              THEN ${schema_1.productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
            onSale: (0, drizzle_orm_1.sql) `
          CASE
            WHEN SUM(
              CASE
                WHEN ${schema_1.productVariants.salePrice} > 0
                 AND ${schema_1.productVariants.salePrice} < ${schema_1.productVariants.regularPrice}
                THEN 1 ELSE 0
              END
            ) > 0 THEN 1 ELSE 0
          END
        `,
        })
            .from(schema_1.productVariants)
            .leftJoin(schema_1.inventoryItems, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.inventoryItems.productVariantId, schema_1.productVariants.id)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds)))
            .groupBy(schema_1.productVariants.productId)
            .execute();
        const spByProduct = new Map();
        for (const r of stockPriceRows) {
            spByProduct.set(r.productId, {
                stock: Number(r.stock ?? 0),
                minPrice: r.minPrice == null ? null : Number(r.minPrice),
                maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
                minSale: r.minSale == null ? null : Number(r.minSale),
                onSale: Number(r.onSale ?? 0) === 1,
            });
        }
        const ratingRows = await this.db
            .select({
            productId: schema_1.productReviews.productId,
            ratingCount: (0, drizzle_orm_1.sql) `COUNT(*)`,
            averageRating: (0, drizzle_orm_1.sql) `COALESCE(ROUND(AVG(${schema_1.productReviews.rating})::numeric, 2), 0)`,
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
        const productsByCategory = new Map();
        for (const { category_id, product_id } of pairs) {
            const b = baseById.get(product_id);
            if (!b)
                continue;
            const sp = spByProduct.get(product_id) ?? {
                stock: 0,
                minPrice: null,
                maxPrice: null,
                minSale: null,
                onSale: false,
            };
            const rt = ratingsByProduct.get(product_id) ?? {
                ratingCount: 0,
                averageRating: 0,
            };
            const minRegular = Number(sp.minPrice ?? 0);
            const maxRegular = Number(sp.maxPrice ?? sp.minPrice ?? 0);
            const onSale = Boolean(sp.onSale);
            const minSale = sp.minSale == null ? null : Number(sp.minSale);
            const images = b.imageUrl
                ? { id: 'default', src: b.imageUrl, alt: null }
                : null;
            const productDto = {
                id: b.id,
                name: b.name,
                slug: b.slug,
                images: images ? [images] : [],
                stock: sp.stock,
                price: String(minRegular),
                regular_price: String(minRegular),
                sale_price: onSale && minSale ? String(minSale) : null,
                on_sale: onSale,
                price_html: (0, product_mapper_1.buildDiscountAwarePriceHtml)(minRegular, maxRegular, minSale, onSale),
                averageRating: rt.averageRating,
                ratingCount: rt.ratingCount,
            };
            const list = productsByCategory.get(category_id) ?? [];
            list.push(productDto);
            productsByCategory.set(category_id, list);
        }
        return {
            parent,
            groups: childCats.map((c) => ({
                category: c,
                products: productsByCategory.get(c.id) ?? [],
            })),
            exploreMore,
        };
    }
    async listProductsGroupedUnderParentCategorySlug(companyId, storeId, parentSlug, query) {
        const parent = await this.db
            .select({ id: schema_1.categories.id })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.slug, parentSlug), (0, drizzle_orm_1.sql) `${schema_1.categories.deletedAt} IS NULL`))
            .limit(1)
            .execute()
            .then((r) => r[0]);
        if (!parent?.id)
            return { parent: null, groups: [], exploreMore: [] };
        return this.listProductsGroupedUnderParentCategory(companyId, storeId, parent.id, query);
    }
};
exports.ProductsCollectionsService = ProductsCollectionsService;
exports.ProductsCollectionsService = ProductsCollectionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], ProductsCollectionsService);
//# sourceMappingURL=products-collections.service.js.map