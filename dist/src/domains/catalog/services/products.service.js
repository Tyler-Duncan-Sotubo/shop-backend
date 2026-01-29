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
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const slugify_1 = require("../utils/slugify");
const categories_service_1 = require("./categories.service");
const linked_products_service_1 = require("./linked-products.service");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
const product_mapper_1 = require("../mappers/product.mapper");
const config_1 = require("@nestjs/config");
const inventory_stock_service_1 = require("../../commerce/inventory/services/inventory-stock.service");
let ProductsService = class ProductsService {
    constructor(db, cache, auditService, categoryService, linkedProductsService, aws, configService, inventoryService) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.categoryService = categoryService;
        this.linkedProductsService = linkedProductsService;
        this.aws = aws;
        this.configService = configService;
        this.inventoryService = inventoryService;
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
    assertS3KeyAllowed(companyId, key) {
        const prefix = `companies/${companyId}/products/`;
        if (!key.startsWith(prefix)) {
            throw new common_1.BadRequestException('Invalid image key');
        }
        if (key.includes('..')) {
            throw new common_1.BadRequestException('Invalid image key');
        }
    }
    async createProductImageFromS3Key(opts) {
        const { tx, companyId, product, image } = opts;
        this.assertS3KeyAllowed(companyId, image.key);
        await this.aws.assertObjectExists(image.key);
        const isTmp = image.key.includes('/tmp/');
        const finalKey = isTmp
            ? `companies/${companyId}/products/${product.id}/${image.fileName ?? `img-${Date.now()}`}`
            : image.key;
        const moved = isTmp
            ? await this.aws.moveObject({
                fromKey: image.key,
                toKey: finalKey,
            })
            : {
                key: finalKey,
                url: `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${finalKey}`,
            };
        const [row] = await tx
            .insert(schema_1.productImages)
            .values({
            companyId,
            productId: product.id,
            variantId: null,
            fileName: image.fileName ?? null,
            mimeType: image.mimeType ?? null,
            url: moved.url,
            altText: image.altText ?? null,
            position: image.position ?? 1,
            storageKey: moved.key,
        })
            .returning({ id: schema_1.productImages.id })
            .execute();
        return row;
    }
    async createProduct(companyId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        const slug = (0, slugify_1.slugify)(dto.slug ?? dto.name);
        await this.ensureSlugUnique(companyId, slug);
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
        const linksByType = dto.links ?? {};
        const productType = dto.productType ?? 'simple';
        const maxImages = productType === 'variable' ? 1 : 9;
        if (dto.images?.length && dto.images.length > maxImages) {
            throw new common_1.BadRequestException(`Too many images. Max is ${maxImages}.`);
        }
        const safeDefaultIndex = productType === 'variable' ? 0 : (dto.defaultImageIndex ?? 0);
        if (productType === 'simple' && dto.sku?.trim()) {
            await this.ensureSkuUnique(companyId, dto.sku.trim());
        }
        const shouldSyncSalesCategory = productType === 'simple' &&
            dto.salePrice != null &&
            String(dto.salePrice).trim() !== '';
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
                productType,
                isGiftCard: dto.isGiftCard ?? false,
                seoTitle: dto.seoTitle ?? null,
                moq: dto.moq ?? 1,
                seoDescription: dto.seoDescription ?? null,
                metadata: dto.metadata ?? {},
            })
                .returning()
                .execute();
            let defaultImageId = null;
            if (dto.images?.length) {
                const inserted = [];
                for (let i = 0; i < dto.images.length; i++) {
                    const image = dto.images[i];
                    const position = image.position ?? i;
                    const img = await this.createProductImageFromS3Key({
                        tx,
                        companyId,
                        product,
                        image: {
                            key: image.key,
                            mimeType: image.mimeType,
                            fileName: image.fileName,
                            altText: image.altText,
                            position,
                        },
                    });
                    inserted.push(img);
                }
                const chosen = inserted[safeDefaultIndex] ?? inserted[0];
                defaultImageId = chosen?.id ?? null;
                if (chosen) {
                    await tx
                        .update(schema_1.products)
                        .set({ defaultImageId: chosen.id, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, product.id)));
                }
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
            if (productType === 'simple') {
                const variantMetadata = {};
                if (dto.lowStockThreshold !== undefined) {
                    variantMetadata.low_stock_threshold = dto.lowStockThreshold;
                }
                const [variant] = await tx
                    .insert(schema_1.productVariants)
                    .values({
                    companyId,
                    productId: product.id,
                    storeId: dto.storeId,
                    imageId: defaultImageId,
                    title: 'Default',
                    sku: dto.sku?.trim() ? dto.sku.trim() : null,
                    barcode: dto.barcode?.trim() ? dto.barcode.trim() : null,
                    option1: null,
                    option2: null,
                    option3: null,
                    isActive: true,
                    regularPrice: dto.regularPrice ?? '0',
                    salePrice: dto.salePrice?.trim() ? dto.salePrice.trim() : null,
                    currency: 'NGN',
                    weight: dto.weight?.trim() ? dto.weight.trim() : null,
                    length: dto.length?.trim() ? dto.length.trim() : null,
                    width: dto.width?.trim() ? dto.width.trim() : null,
                    height: dto.height?.trim() ? dto.height.trim() : null,
                    metadata: variantMetadata,
                })
                    .returning()
                    .execute();
                const stockQty = dto.stockQuantity !== undefined &&
                    String(dto.stockQuantity).trim() !== ''
                    ? Number(dto.stockQuantity)
                    : 0;
                const safetyStock = dto.lowStockThreshold !== undefined &&
                    String(dto.lowStockThreshold).trim() !== ''
                    ? Number(dto.lowStockThreshold)
                    : 0;
                await this.inventoryService.setInventoryLevel(companyId, variant.id, stockQty, safetyStock, user, ip, { tx, skipCacheBump: true, skipAudit: true });
            }
            return product;
        });
        if (shouldSyncSalesCategory) {
            await this.categoryService.syncSalesCategoryForProduct({
                companyId,
                storeId: dto.storeId,
                productId: created.id,
            });
        }
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
                    productType,
                    categoryIds: uniqueCategoryIds,
                    links: dto.links ?? {},
                    imagesCount: dto.images?.length ?? 0,
                    defaultImageIndex: safeDefaultIndex,
                    ...(productType === 'simple'
                        ? {
                            sku: dto.sku ?? null,
                            regularPrice: dto.regularPrice ?? '0',
                            salePrice: dto.salePrice ?? null,
                            stockQuantity: dto.stockQuantity ?? null,
                            lowStockThreshold: dto.lowStockThreshold ?? null,
                        }
                        : {}),
                },
            });
        }
        return created;
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
            const items = await this.listProducts(companyId, storeId, query);
            const productIds = items.map((p) => p.id).filter(Boolean);
            if (productIds.length === 0) {
                return { items, total, limit, offset };
            }
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
        const variantIds = (product.variants ?? [])
            .map((v) => v.id)
            .filter(Boolean);
        const stockByVariantId = new Map();
        if (variantIds.length) {
            const stockRows = await this.db
                .select({
                variantId: schema_1.inventoryItems.productVariantId,
                stock: (0, drizzle_orm_1.sql) `
        GREATEST(
          COALESCE(SUM(${schema_1.inventoryItems.available}), 0)
          - COALESCE(SUM(${schema_1.inventoryItems.reserved}), 0)
          - COALESCE(SUM(${schema_1.inventoryItems.safetyStock}), 0),
          0
        )
      `,
            })
                .from(schema_1.inventoryItems)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.inventoryItems.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.inventoryItems.productVariantId, variantIds)))
                .groupBy(schema_1.inventoryItems.productVariantId)
                .execute();
            for (const r of stockRows) {
                stockByVariantId.set(r.variantId, Number(r.stock ?? 0));
            }
        }
        product.variants = (product.variants ?? []).map((v) => ({
            ...v,
            stock: stockByVariantId.get(v.id) ?? 0,
        }));
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
                moq: schema_1.products.moq,
                defaultImageId: schema_1.products.defaultImageId,
            })
                .from(schema_1.products)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
                .limit(1)
                .then((rows) => rows[0]);
            if (!product) {
                throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
            }
            const images = await this.db
                .select({
                id: schema_1.productImages.id,
                url: schema_1.productImages.url,
                altText: schema_1.productImages.altText,
                position: schema_1.productImages.position,
                fileName: schema_1.productImages.fileName,
                mimeType: schema_1.productImages.mimeType,
                size: schema_1.productImages.size,
                width: schema_1.productImages.width,
                height: schema_1.productImages.height,
            })
                .from(schema_1.productImages)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId)))
                .orderBy(schema_1.productImages.position)
                .execute();
            const foundDefaultIndex = images.findIndex((img) => img.id === product.defaultImageId);
            const defaultImageIndex = foundDefaultIndex >= 0 ? foundDefaultIndex : 0;
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
                moq: product.moq,
                images: images.map((img) => ({
                    id: img.id,
                    url: img.url,
                })),
                defaultImageIndex,
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
            const nextProductType = dto.productType ?? existing.productType;
            const [p] = await tx
                .update(schema_1.products)
                .set({
                name: dto.name ?? existing.name,
                description: dto.description ?? existing.description,
                slug,
                status: dto.status ?? existing.status,
                isGiftCard: dto.isGiftCard ?? existing.isGiftCard,
                productType: nextProductType,
                seoTitle: dto.seoTitle ?? existing.seoTitle,
                seoDescription: dto.seoDescription ?? existing.seoDescription,
                moq: dto.moq ?? existing.moq,
                metadata: dto.metadata ?? existing.metadata,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
                .returning()
                .execute();
            if (!p)
                throw new common_1.NotFoundException('Product not found');
            if (dto.images) {
                const maxImages = nextProductType === 'variable' ? 1 : 9;
                if (Array.isArray(dto.images) && dto.images.length > maxImages) {
                    throw new common_1.BadRequestException(`Too many images. Max is ${maxImages}.`);
                }
                const incoming = Array.isArray(dto.images) ? dto.images : [];
                const currentImages = await tx
                    .select({
                    id: schema_1.productImages.id,
                    url: schema_1.productImages.url,
                    position: schema_1.productImages.position,
                })
                    .from(schema_1.productImages)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
                    .orderBy(schema_1.productImages.position)
                    .execute();
                const inserted = [];
                for (let i = 0; i < incoming.length; i++) {
                    const img = incoming[i];
                    if (!img?.key && !img?.url) {
                        throw new common_1.BadRequestException('Image must include key or url');
                    }
                    const key = img.key ?? (img.url ? this.aws.extractKeyFromUrl(img.url) : null);
                    if (!key)
                        throw new common_1.BadRequestException('Invalid image url/key');
                    const prefix = `companies/${companyId}/products/`;
                    if (!key.startsWith(prefix) || key.includes('..')) {
                        throw new common_1.BadRequestException('Invalid image key');
                    }
                    try {
                        await this.aws.assertObjectExists(key);
                    }
                    catch {
                        throw new common_1.BadRequestException('Uploaded image not found in storage');
                    }
                    const position = typeof img.position === 'number' ? img.position : i;
                    const isTmp = key.includes('/tmp/');
                    const safeProvidedName = this.sanitizeFileName(img.fileName);
                    const inferredExt = img.mimeType?.startsWith('image/')
                        ? `.${img.mimeType.split('/')[1] || 'jpg'}`
                        : '.jpg';
                    const finalFileName = safeProvidedName && safeProvidedName.includes('.')
                        ? safeProvidedName
                        : safeProvidedName
                            ? `${safeProvidedName}${inferredExt}`
                            : `product-${productId}-${position}-${Date.now()}${inferredExt}`;
                    const finalKey = isTmp
                        ? `companies/${companyId}/products/${productId}/${finalFileName}`
                        : key;
                    const moved = isTmp
                        ? await this.aws.moveObject({ fromKey: key, toKey: finalKey })
                        : {
                            key: finalKey,
                            url: img.url ??
                                `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${finalKey}`,
                        };
                    const mimeType = (img.mimeType ?? 'image/jpeg').trim() || 'image/jpeg';
                    const [row] = await tx
                        .insert(schema_1.productImages)
                        .values({
                        companyId,
                        productId,
                        variantId: null,
                        url: moved.url,
                        altText: img.altText ?? `${p.name} product image`,
                        fileName: img.fileName ?? finalFileName ?? null,
                        mimeType,
                        size: null,
                        width: null,
                        height: null,
                        position,
                    })
                        .returning()
                        .execute();
                    inserted.push({ id: row.id, url: row.url, position });
                }
                const safeDefaultIndex = nextProductType === 'variable' ? 0 : (dto.defaultImageIndex ?? 0);
                const chosen = inserted[safeDefaultIndex] ?? inserted[0] ?? null;
                await tx
                    .update(schema_1.products)
                    .set({
                    defaultImageId: chosen ? chosen.id : null,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
                    .execute();
                if (currentImages.length) {
                    await tx
                        .update(schema_1.productImages)
                        .set({ deletedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
                        .execute();
                    for (const old of currentImages) {
                        const oldKey = this.aws.extractKeyFromUrl(old.url);
                        if (!oldKey)
                            continue;
                        try {
                            await this.aws.deleteFromS3(oldKey);
                        }
                        catch {
                        }
                    }
                }
                if (nextProductType === 'simple') {
                    const defaultVariant = await tx
                        .select({ id: schema_1.productVariants.id })
                        .from(schema_1.productVariants)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productVariants.title, 'Default')))
                        .limit(1)
                        .execute()
                        .then((r) => r[0]);
                    if (defaultVariant) {
                        await tx
                            .update(schema_1.productVariants)
                            .set({ imageId: chosen?.id ?? null, updatedAt: new Date() })
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, defaultVariant.id)))
                            .execute();
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
            if (nextProductType === 'simple') {
                const defaultVariant = await tx
                    .select({
                    id: schema_1.productVariants.id,
                    sku: schema_1.productVariants.sku,
                })
                    .from(schema_1.productVariants)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productVariants.title, 'Default')))
                    .limit(1)
                    .execute()
                    .then((r) => r[0]);
                const incomingSku = dto.sku?.trim() ? dto.sku.trim() : undefined;
                if (incomingSku) {
                    const currentSku = defaultVariant?.sku ?? null;
                    if (!currentSku || currentSku !== incomingSku) {
                        await this.ensureSkuUnique(companyId, incomingSku);
                    }
                }
                const variantMetadataPatch = {};
                if (dto.lowStockThreshold !== undefined) {
                    variantMetadataPatch.low_stock_threshold = dto.lowStockThreshold;
                }
                const productRow = await tx
                    .select({ defaultImageId: schema_1.products.defaultImageId })
                    .from(schema_1.products)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
                    .limit(1)
                    .execute()
                    .then((r) => r[0]);
                let variantId;
                if (defaultVariant) {
                    const updates = {
                        updatedAt: new Date(),
                    };
                    if (dto.sku !== undefined)
                        updates.sku = incomingSku ?? null;
                    if (dto.barcode !== undefined)
                        updates.barcode = dto.barcode?.trim() ? dto.barcode.trim() : null;
                    if (dto.regularPrice !== undefined) {
                        const v = dto.regularPrice === null
                            ? undefined
                            : String(dto.regularPrice).trim();
                        if (v)
                            updates.regularPrice = v;
                    }
                    if (dto.salePrice !== undefined) {
                        const v = dto.salePrice === null ? undefined : String(dto.salePrice).trim();
                        if (v) {
                            updates.salePrice = v;
                        }
                    }
                    if (dto.weight !== undefined)
                        updates.weight = dto.weight?.trim() ? dto.weight.trim() : null;
                    if (dto.length !== undefined)
                        updates.length = dto.length?.trim() ? dto.length.trim() : null;
                    if (dto.width !== undefined)
                        updates.width = dto.width?.trim() ? dto.width.trim() : null;
                    if (dto.height !== undefined)
                        updates.height = dto.height?.trim() ? dto.height.trim() : null;
                    if (productRow)
                        updates.imageId = productRow.defaultImageId ?? null;
                    if (dto.lowStockThreshold !== undefined) {
                        const current = await tx
                            .select({ metadata: schema_1.productVariants.metadata })
                            .from(schema_1.productVariants)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, defaultVariant.id)))
                            .limit(1)
                            .execute()
                            .then((r) => r[0]);
                        updates.metadata = {
                            ...(current?.metadata ?? {}),
                            ...variantMetadataPatch,
                        };
                    }
                    await tx
                        .update(schema_1.productVariants)
                        .set(updates)
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, defaultVariant.id)))
                        .execute();
                    variantId = defaultVariant.id;
                }
                else {
                    const [variant] = await tx
                        .insert(schema_1.productVariants)
                        .values({
                        companyId,
                        productId,
                        storeId: p.storeId,
                        imageId: productRow?.defaultImageId ?? null,
                        title: 'Default',
                        sku: incomingSku ?? null,
                        barcode: dto.barcode?.trim() ? dto.barcode.trim() : null,
                        option1: null,
                        option2: null,
                        option3: null,
                        isActive: true,
                        regularPrice: dto.regularPrice ?? '0',
                        salePrice: dto.salePrice?.trim() ? dto.salePrice.trim() : null,
                        currency: 'NGN',
                        weight: dto.weight?.trim() ? dto.weight.trim() : null,
                        length: dto.length?.trim() ? dto.length.trim() : null,
                        width: dto.width?.trim() ? dto.width.trim() : null,
                        height: dto.height?.trim() ? dto.height.trim() : null,
                        metadata: variantMetadataPatch,
                    })
                        .returning()
                        .execute();
                    variantId = variant.id;
                }
                const shouldUpdateInventory = dto.stockQuantity !== undefined ||
                    dto.lowStockThreshold !== undefined;
                if (shouldUpdateInventory) {
                    const stockQty = dto.stockQuantity !== undefined &&
                        String(dto.stockQuantity).trim() !== ''
                        ? Number(dto.stockQuantity)
                        : 0;
                    const safetyStock = dto.lowStockThreshold !== undefined &&
                        String(dto.lowStockThreshold).trim() !== ''
                        ? Number(dto.lowStockThreshold)
                        : 0;
                    await this.inventoryService.setInventoryLevel(companyId, variantId, stockQty, safetyStock, user, ip, { tx, skipCacheBump: true, skipAudit: true });
                }
            }
            return p;
        });
        const finalProductType = dto.productType ?? existing.productType;
        const shouldSyncSalesCategory = finalProductType === 'simple' &&
            dto.salePrice !== undefined &&
            dto.salePrice != null &&
            String(dto.salePrice).trim() !== '';
        if (shouldSyncSalesCategory) {
            await this.categoryService.syncSalesCategoryForProduct({
                companyId,
                storeId: updated.storeId,
                productId: updated.id,
            });
        }
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
                        defaultImageId: existing.defaultImageId,
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
                    imagesCount: dto.images?.length,
                    defaultImageIndex: (dto.productType ?? existing.productType) === 'variable'
                        ? 0
                        : dto.defaultImageIndex,
                    ...(finalProductType === 'simple'
                        ? {
                            sku: dto.sku ?? undefined,
                            regularPrice: dto.regularPrice ?? undefined,
                            salePrice: dto.salePrice ?? undefined,
                            stockQuantity: dto.stockQuantity ?? undefined,
                            lowStockThreshold: dto.lowStockThreshold ?? undefined,
                        }
                        : {}),
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
            return {
                category: categoryForResponse,
                products: productsList,
            };
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
        if (childCats.length === 0) {
            return { parent, groups: [], exploreMore };
        }
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
                ? {
                    id: 'default',
                    src: b.imageUrl,
                    alt: null,
                }
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
    async ensureSkuUnique(companyId, sku, excludeVariantId) {
        if (!sku)
            return;
        const existing = await this.db
            .select({ id: schema_1.productVariants.id })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.sku, sku)))
            .execute();
        const conflict = existing.find((v) => v.id !== excludeVariantId);
        if (conflict) {
            throw new common_1.ConflictException(`SKU "${sku}" already exists for this company`);
        }
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
        aws_service_1.AwsService,
        config_1.ConfigService,
        inventory_stock_service_1.InventoryStockService])
], ProductsService);
//# sourceMappingURL=products.service.js.map