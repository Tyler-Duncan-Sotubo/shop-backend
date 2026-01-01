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
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../drizzle/drizzle.module");
const schema_1 = require("../../../drizzle/schema");
const cache_service_1 = require("../../../common/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const slugify_1 = require("../utils/slugify");
const categories_service_1 = require("./categories.service");
const linked_products_service_1 = require("./linked-products.service");
const aws_service_1 = require("../../../common/aws/aws.service");
const product_mapper_1 = require("../mappers/product.mapper");
let ProductsService = class ProductsService {
    constructor(db, cache, auditService, categoryService, linkedProductsService, aws) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.categoryService = categoryService;
        this.linkedProductsService = linkedProductsService;
        this.aws = aws;
    }
    async assertCompanyExists(companyId) {
        const company = await this.db.query.companies.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
        });
        if (!company) {
            throw new common_1.NotFoundException('Company not found');
        }
        return company;
    }
    async findProductByIdOrThrow(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
            with: {
                variants: true,
                images: true,
                productCategories: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
        }
        return product;
    }
    async ensureSlugUnique(companyId, slug, excludeId) {
        const existing = await this.db
            .select({ id: schema_1.products.id })
            .from(schema_1.products)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.slug, slug)))
            .execute();
        const conflict = existing.find((p) => p.id !== excludeId);
        if (conflict) {
            throw new common_1.ConflictException(`Slug "${slug}" already exists for company`);
        }
    }
    sanitizeFileName(name) {
        const raw = (name ?? '').trim();
        if (!raw)
            return null;
        return raw
            .replace(/[/\\]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '');
    }
    extractStorageKeyFromUrl(url) {
        if (!url)
            return null;
        try {
            const u = new URL(url);
            return u.pathname.replace(/^\//, '');
        }
        catch {
            return null;
        }
    }
    async createProduct(companyId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        const slug = (0, slugify_1.slugify)(dto.slug ?? dto.name);
        await this.ensureSlugUnique(companyId, slug);
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
        const linksByType = dto.links ?? {};
        const created = await this.db.transaction(async (tx) => {
            const [product] = await tx
                .insert(schema_1.products)
                .values({
                companyId,
                storeId: dto.storeId,
                name: dto.name,
                description: dto.description ?? null,
                slug,
                status: dto.status ?? 'draft',
                productType: dto.productType ?? 'simple',
                isGiftCard: dto.isGiftCard ?? false,
                seoTitle: dto.seoTitle ?? null,
                seoDescription: dto.seoDescription ?? null,
                metadata: dto.metadata ?? {},
            })
                .returning()
                .execute();
            if (dto.base64Image) {
                const mimeType = (dto.imageMimeType ?? 'image/jpeg').trim() || 'image/jpeg';
                const safeProvidedName = this.sanitizeFileName(dto.imageFileName);
                const extFromMime = mimeType.startsWith('image/')
                    ? `.${mimeType.split('/')[1] || 'jpg'}`
                    : '.bin';
                const fallbackName = `${product.id}-default-${Date.now()}${extFromMime}`;
                const fileName = safeProvidedName && safeProvidedName.includes('.')
                    ? safeProvidedName
                    : safeProvidedName
                        ? `${safeProvidedName}${extFromMime}`
                        : fallbackName;
                const normalized = dto.base64Image.includes(',')
                    ? dto.base64Image.split(',')[1]
                    : dto.base64Image;
                let buffer;
                try {
                    buffer = Buffer.from(normalized, 'base64');
                }
                catch {
                    throw new common_1.BadRequestException('Invalid base64Image');
                }
                const size = buffer.byteLength;
                let width = null;
                let height = null;
                if (mimeType.startsWith('image/')) {
                    try {
                        const sharpMod = await Promise.resolve().then(() => require('sharp'));
                        const sharpFn = sharpMod.default ?? sharpMod;
                        const meta = await sharpFn(buffer).metadata();
                        width = meta.width ?? null;
                        height = meta.height ?? null;
                    }
                    catch {
                    }
                }
                const url = await this.aws.uploadImageToS3(companyId, fileName, dto.base64Image);
                const [img] = await tx
                    .insert(schema_1.productImages)
                    .values({
                    companyId,
                    productId: product.id,
                    variantId: null,
                    url,
                    altText: dto.imageAltText ?? `${product.name} product image`,
                    fileName,
                    mimeType,
                    size,
                    width,
                    height,
                    position: 0,
                })
                    .returning()
                    .execute();
                await tx
                    .update(schema_1.products)
                    .set({ defaultImageId: img.id, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, product.id)));
            }
            if (uniqueCategoryIds.length) {
                await this.categoryService.assertCategoriesBelongToCompany(companyId, uniqueCategoryIds);
                await tx
                    .insert(schema_1.productCategories)
                    .values(uniqueCategoryIds.map((categoryId) => ({
                    companyId,
                    productId: product.id,
                    categoryId,
                })))
                    .execute();
            }
            const allLinkedIds = [];
            for (const ids of Object.values(linksByType)) {
                if (Array.isArray(ids))
                    allLinkedIds.push(...ids);
            }
            const uniqueAllLinkedIds = Array.from(new Set(allLinkedIds.filter((id) => id && id !== product.id)));
            if (uniqueAllLinkedIds.length) {
                await this.linkedProductsService.assertProductsBelongToCompany(companyId, uniqueAllLinkedIds);
                const rowsToInsert = [];
                for (const [linkType, ids] of Object.entries(linksByType)) {
                    if (!ids?.length)
                        continue;
                    const cleaned = Array.from(new Set(ids.filter((id) => id && id !== product.id)));
                    cleaned.forEach((linkedProductId, index) => {
                        rowsToInsert.push({
                            companyId,
                            productId: product.id,
                            linkedProductId,
                            linkType,
                            position: index + 1,
                        });
                    });
                }
                if (rowsToInsert.length) {
                    await tx.insert(schema_1.productLinks).values(rowsToInsert).execute();
                }
            }
            return product;
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'create',
                entity: 'product',
                entityId: created.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created product',
                changes: {
                    companyId,
                    productId: created.id,
                    name: created.name,
                    status: created.status,
                    categoryIds: uniqueCategoryIds,
                    links: dto.links ?? {},
                },
            });
        }
        return created;
    }
    async listProductsAdmin(companyId, query) {
        const { search, status, categoryId, storeId, limit = 50, offset = 0, } = query;
        return this.cache.getOrSetVersioned(companyId, [
            'catalog',
            'products',
            'admin',
            JSON.stringify({
                storeId: storeId ?? null,
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
            let count;
            if (categoryId) {
                const countWithCategoryQuery = this.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.products.id})` })
                    .from(schema_1.products)
                    .innerJoin(schema_1.productCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, schema_1.products.id), (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, categoryId)))
                    .innerJoin(schema_1.categories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, schema_1.productCategories.categoryId)));
                const [{ count: categoryCount }] = await countWithCategoryQuery
                    .where((0, drizzle_orm_1.and)(...whereClauses))
                    .execute();
                count = Number(categoryCount) || 0;
            }
            else {
                const countWithoutCategoryQuery = this.db
                    .select({ count: (0, drizzle_orm_1.sql) `count(distinct ${schema_1.products.id})` })
                    .from(schema_1.products);
                const [{ count: basicCount }] = await countWithoutCategoryQuery
                    .where((0, drizzle_orm_1.and)(...whereClauses))
                    .execute();
                count = Number(basicCount) || 0;
            }
            const total = Number(count) || 0;
            const items = await this.listProducts(companyId, storeId, query);
            return { items, total, limit, offset };
        });
    }
    async listProducts(companyId, storeId, query) {
        const { search, status, categoryId, limit = 50, offset = 0 } = query;
        return this.cache.getOrSetVersioned(companyId, [
            'catalog',
            'products',
            JSON.stringify({
                storeId: storeId ?? null,
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
            if (status === 'archived') {
                whereClauses.push((0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NOT NULL`);
            }
            else {
                whereClauses.push((0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`);
            }
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
            if (page.length === 0)
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
        const products = await this.db.query.products.findMany({
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
        return products;
    }
    async getProductById(companyId, productId) {
        return this.findProductByIdOrThrow(companyId, productId);
    }
    async getProductWithRelations(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (fields, { and, eq }) => and(eq(fields.id, productId), eq(fields.companyId, companyId)),
            with: {
                variants: true,
                options: {
                    with: { values: true },
                },
                images: true,
                productCategories: {
                    with: { category: true },
                },
                defaultVariant: true,
            },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
        }
        return product;
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
    async getProductForEdit(companyId, productId) {
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'product', productId, 'edit'], async () => {
            const product = await this.db
                .select({
                id: schema_1.products.id,
                name: schema_1.products.name,
                description: schema_1.products.description,
                status: schema_1.products.status,
                productType: schema_1.products.productType,
                seoTitle: schema_1.products.seoTitle,
                seoDescription: schema_1.products.seoDescription,
                metadata: schema_1.products.metadata,
                createdAt: schema_1.products.createdAt,
                updatedAt: schema_1.products.updatedAt,
                imageUrl: schema_1.productImages.url,
            })
                .from(schema_1.products)
                .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
                .limit(1)
                .then((rows) => rows[0]);
            if (!product) {
                throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
            }
            const cats = await this.db
                .select({ categoryId: schema_1.productCategories.categoryId })
                .from(schema_1.productCategories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId)))
                .execute();
            const categoryIds = cats.map((c) => c.categoryId);
            const linksRows = await this.db
                .select({
                linkedProductId: schema_1.productLinks.linkedProductId,
                linkType: schema_1.productLinks.linkType,
                position: schema_1.productLinks.position,
            })
                .from(schema_1.productLinks)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productLinks.productId, productId)))
                .execute();
            linksRows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
            const links = {
                related: [],
                upsell: [],
                cross_sell: [],
            };
            for (const r of linksRows) {
                const t = r.linkType;
                if (t === 'related')
                    links.related.push(r.linkedProductId);
                else if (t === 'upsell')
                    links.upsell.push(r.linkedProductId);
                else if (t === 'cross_sell')
                    links.cross_sell.push(r.linkedProductId);
            }
            return {
                id: product.id,
                name: product.name,
                description: product.description ?? null,
                status: product.status,
                productType: product.productType,
                imageUrl: product.imageUrl ?? null,
                seoTitle: product.seoTitle ?? null,
                seoDescription: product.seoDescription ?? null,
                metadata: (product.metadata ?? {}),
                categoryIds,
                links,
                createdAt: product.createdAt,
                updatedAt: product.updatedAt,
            };
        });
    }
    async updateProduct(companyId, productId, dto, user, ip) {
        const existing = await this.findProductByIdOrThrow(companyId, productId);
        let slug = existing.slug;
        if (dto.slug) {
            slug = (0, slugify_1.slugify)(dto.slug);
            if (slug !== existing.slug) {
                await this.ensureSlugUnique(companyId, slug, productId);
            }
        }
        const updated = await this.db.transaction(async (tx) => {
            const [p] = await tx
                .update(schema_1.products)
                .set({
                name: dto.name ?? existing.name,
                description: dto.description ?? existing.description,
                slug,
                status: dto.status ?? existing.status,
                isGiftCard: dto.isGiftCard ?? existing.isGiftCard,
                productType: dto.productType ?? existing.productType,
                seoTitle: dto.seoTitle ?? existing.seoTitle,
                seoDescription: dto.seoDescription ?? existing.seoDescription,
                metadata: dto.metadata ?? existing.metadata,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
                .returning()
                .execute();
            if (!p)
                throw new common_1.NotFoundException('Product not found');
            if (dto.base64Image) {
                const mimeType = (dto.imageMimeType ?? 'image/jpeg').trim() || 'image/jpeg';
                const safeProvidedName = this.sanitizeFileName(dto.imageFileName);
                const extFromMime = mimeType.startsWith('image/')
                    ? `.${mimeType.split('/')[1] || 'jpg'}`
                    : '.bin';
                const fallbackName = `${productId}-default-${Date.now()}${extFromMime}`;
                const fileName = safeProvidedName && safeProvidedName.includes('.')
                    ? safeProvidedName
                    : safeProvidedName
                        ? `${safeProvidedName}${extFromMime}`
                        : fallbackName;
                const normalized = dto.base64Image.includes(',')
                    ? dto.base64Image.split(',')[1]
                    : dto.base64Image;
                let buffer;
                try {
                    buffer = Buffer.from(normalized, 'base64');
                }
                catch {
                    throw new common_1.BadRequestException('Invalid base64Image');
                }
                const size = buffer.byteLength;
                let width = null;
                let height = null;
                if (mimeType.startsWith('image/')) {
                    try {
                        const sharpMod = await Promise.resolve().then(() => require('sharp'));
                        const sharpFn = sharpMod.default ?? sharpMod;
                        const meta = await sharpFn(buffer).metadata();
                        width = meta.width ?? null;
                        height = meta.height ?? null;
                    }
                    catch {
                    }
                }
                const currentDefaultImageId = existing.defaultImageId ?? null;
                const currentDefaultImage = currentDefaultImageId
                    ? await tx.query.productImages.findFirst({
                        where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, currentDefaultImageId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)),
                    })
                    : null;
                const url = await this.aws.uploadImageToS3(companyId, fileName, dto.base64Image);
                const [img] = await tx
                    .insert(schema_1.productImages)
                    .values({
                    companyId,
                    productId,
                    variantId: null,
                    url,
                    altText: dto.imageAltText ?? `${existing.name} product image`,
                    fileName,
                    mimeType,
                    size,
                    width,
                    height,
                    position: 0,
                })
                    .returning()
                    .execute();
                await tx
                    .update(schema_1.products)
                    .set({ defaultImageId: img.id, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, existing.id)));
                if (currentDefaultImage?.url && currentDefaultImage.url !== url) {
                    const oldKey = this.extractStorageKeyFromUrl(currentDefaultImage.url);
                    if (oldKey) {
                        try {
                            await this.aws.deleteFromS3(oldKey);
                        }
                        catch {
                        }
                    }
                }
            }
            if (dto.categoryIds) {
                const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
                await this.categoryService.assertCategoriesBelongToCompany(companyId, uniqueCategoryIds);
                await tx
                    .delete(schema_1.productCategories)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId)))
                    .execute();
                if (uniqueCategoryIds.length) {
                    await tx
                        .insert(schema_1.productCategories)
                        .values(uniqueCategoryIds.map((categoryId) => ({
                        companyId,
                        productId,
                        categoryId,
                    })))
                        .execute();
                }
            }
            if (dto.links) {
                const linksByType = dto.links ?? {};
                const allLinkedIds = [];
                for (const ids of Object.values(linksByType)) {
                    if (Array.isArray(ids))
                        allLinkedIds.push(...ids);
                }
                const uniqueAllLinkedIds = Array.from(new Set(allLinkedIds.filter((id) => id && id !== productId)));
                if (uniqueAllLinkedIds.length) {
                    await this.linkedProductsService.assertProductsBelongToCompany(companyId, uniqueAllLinkedIds);
                }
                await tx
                    .delete(schema_1.productLinks)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productLinks.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productLinks.productId, productId)))
                    .execute();
                const rowsToInsert = [];
                for (const [linkType, ids] of Object.entries(linksByType)) {
                    if (!ids?.length)
                        continue;
                    const cleaned = Array.from(new Set(ids.filter((id) => id && id !== productId)));
                    cleaned.forEach((linkedProductId, index) => {
                        rowsToInsert.push({
                            companyId,
                            productId,
                            linkedProductId,
                            linkType,
                            position: index + 1,
                        });
                    });
                }
                if (rowsToInsert.length) {
                    await tx.insert(schema_1.productLinks).values(rowsToInsert).execute();
                }
            }
            return p;
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'product',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated product',
                changes: {
                    companyId,
                    productId: updated.id,
                    before: {
                        name: existing.name,
                        description: existing.description,
                        slug: existing.slug,
                        status: existing.status,
                        isGiftCard: existing.isGiftCard,
                        productType: existing.productType,
                        seoTitle: existing.seoTitle,
                        seoDescription: existing.seoDescription,
                        metadata: existing.metadata,
                    },
                    after: {
                        name: updated.name,
                        description: updated.description,
                        slug: updated.slug,
                        status: updated.status,
                        isGiftCard: updated.isGiftCard,
                        productType: updated.productType,
                        seoTitle: updated.seoTitle,
                        seoDescription: updated.seoDescription,
                        metadata: updated.metadata,
                    },
                    categoryIds: dto.categoryIds,
                    links: dto.links,
                },
            });
        }
        return updated;
    }
    async deleteProduct(companyId, productId, user, ip) {
        const existing = await this.findProductByIdOrThrow(companyId, productId);
        const [deleted] = await this.db
            .update(schema_1.products)
            .set({
            deletedAt: new Date(),
            status: 'archived',
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
            .returning()
            .execute();
        if (!deleted) {
            throw new common_1.NotFoundException('Product not found');
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'delete',
                entity: 'product',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: 'Soft deleted product',
                changes: {
                    companyId,
                    productId,
                    name: existing.name,
                    slug: existing.slug,
                },
            });
        }
        return { success: true };
    }
    async assignCategories(companyId, productId, dto, user, ip) {
        await this.findProductByIdOrThrow(companyId, productId);
        const categoryIds = dto.categoryIds ?? [];
        if (categoryIds.length) {
            const cats = await this.db
                .select({ id: schema_1.categories.id })
                .from(schema_1.categories)
                .where((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId))
                .execute();
            const validIds = new Set(cats.map((c) => c.id));
            const invalid = categoryIds.filter((id) => !validIds.has(id));
            if (invalid.length > 0) {
                throw new common_1.BadRequestException(`Some categories do not belong to this company: ${invalid.join(', ')}`);
            }
        }
        await this.db
            .delete(schema_1.productCategories)
            .where((0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId))
            .execute();
        let inserted = [];
        if (categoryIds.length) {
            inserted = await this.db
                .insert(schema_1.productCategories)
                .values(categoryIds.map((categoryId) => ({
                productId,
                categoryId,
                companyId,
            })))
                .returning()
                .execute();
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.auditService.logAction({
                action: 'update',
                entity: 'product_categories',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated categories assigned to product',
                changes: {
                    companyId,
                    productId,
                    categoryIds,
                },
            });
        }
        return inserted;
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
            const category = await this.db.query.categories.findFirst({
                where: (c, { and, eq, isNull }) => and(eq(c.companyId, companyId), eq(c.storeId, storeId), eq(c.slug, categorySlug), isNull(c.deletedAt)),
                columns: { id: true },
            });
            if (!category)
                return [];
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
            if (productIds.length === 0)
                return [];
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
                minPrice: (0, drizzle_orm_1.sql) `
          MIN(NULLIF(${schema_1.productVariants.regularPrice}, 0))
        `,
                maxPrice: (0, drizzle_orm_1.sql) `
          MAX(NULLIF(${schema_1.productVariants.regularPrice}, 0))
        `,
            })
                .from(schema_1.productVariants)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.productVariants.productId, productIds)))
                .groupBy(schema_1.productVariants.productId)
                .execute();
            const priceByProduct = new Map();
            for (const r of priceRows) {
                const min = r.minPrice == null ? 0 : Number(r.minPrice);
                const max = r.maxPrice == null ? min : Number(r.maxPrice);
                priceByProduct.set(r.productId, { minPrice: min, maxPrice: max });
            }
            return ordered.map((p) => {
                const ratings = ratingsByProduct.get(p.id) ?? {
                    rating_count: 0,
                    average_rating: 0,
                };
                const price = priceByProduct.get(p.id) ?? { minPrice: 0, maxPrice: 0 };
                return (0, product_mapper_1.mapProductToCollectionListResponse)({
                    ...p,
                    rating_count: ratings.rating_count,
                    average_rating: ratings.average_rating,
                    minPrice: price.minPrice,
                    maxPrice: price.maxPrice,
                });
            });
        });
    }
    async listProductsGroupedUnderParentCategory(companyId, storeId, parentCategoryId, query) {
        const { status, search, limit = 8, offset = 0 } = query;
        const effectiveStatus = status ?? 'active';
        const childCats = await this.db
            .select({
            id: schema_1.categories.id,
            name: schema_1.categories.name,
            slug: schema_1.categories.slug,
        })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.parentId, parentCategoryId), (0, drizzle_orm_1.sql) `${schema_1.categories.deletedAt} IS NULL`))
            .orderBy(schema_1.categories.name)
            .execute();
        if (childCats.length === 0) {
            return [];
        }
        const childCatIds = childCats.map((c) => c.id);
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
        if (pairs.length === 0) {
            return childCats.map((c) => ({ category: c, products: [] }));
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
        const productsByCategory = new Map();
        for (const { category_id, product_id } of pairs) {
            const b = baseById.get(product_id);
            if (!b)
                continue;
            const sp = spByProduct.get(product_id) ?? {
                stock: 0,
                minPrice: null,
                maxPrice: null,
            };
            const rt = ratingsByProduct.get(product_id) ?? {
                ratingCount: 0,
                averageRating: 0,
            };
            const productDto = {
                id: b.id,
                name: b.name,
                slug: b.slug,
                imageUrl: b.imageUrl ?? null,
                stock: sp.stock,
                minPrice: sp.minPrice,
                maxPrice: sp.maxPrice,
                averageRating: rt.averageRating,
                ratingCount: rt.ratingCount,
            };
            const list = productsByCategory.get(category_id) ?? [];
            list.push(productDto);
            productsByCategory.set(category_id, list);
        }
        return childCats.map((c) => ({
            category: c,
            products: productsByCategory.get(c.id) ?? [],
        }));
    }
    async listProductsGroupedUnderParentCategorySlug(companyId, storeId, parentSlug, query) {
        console.log('listProductsGroupedUnderParentCategorySlug called with parentSlug:', parentSlug);
        const parent = await this.db
            .select({
            id: schema_1.categories.id,
        })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.slug, parentSlug), (0, drizzle_orm_1.sql) `${schema_1.categories.deletedAt} IS NULL`))
            .limit(1)
            .execute()
            .then((r) => r[0]);
        if (!parent?.id)
            return [];
        return this.listProductsGroupedUnderParentCategory(companyId, storeId, parent.id, query);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        categories_service_1.CategoriesService,
        linked_products_service_1.LinkedProductsService,
        aws_service_1.AwsService])
], ProductsService);
//# sourceMappingURL=products.service.js.map