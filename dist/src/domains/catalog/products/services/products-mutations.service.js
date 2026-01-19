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
exports.ProductsMutationsService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../../audit/audit.service");
const aws_service_1 = require("../../../../infrastructure/aws/aws.service");
const config_1 = require("@nestjs/config");
const products_helpers_service_1 = require("./products-helpers.service");
const categories_service_1 = require("../../services/categories.service");
const linked_products_service_1 = require("../../services/linked-products.service");
let ProductsMutationsService = class ProductsMutationsService {
    constructor(db, cache, auditService, categoryService, linkedProductsService, aws, config, helpers) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.categoryService = categoryService;
        this.linkedProductsService = linkedProductsService;
        this.aws = aws;
        this.config = config;
        this.helpers = helpers;
    }
    buildPublicUrl(key) {
        const bucket = this.config.get('AWS_BUCKET_NAME');
        return `https://${bucket}.s3.amazonaws.com/${key}`;
    }
    async insertImageFromKey(opts) {
        const { tx, companyId, productId, productName, image } = opts;
        this.helpers.assertS3KeyAllowed(companyId, image.key);
        await this.aws.assertObjectExists(image.key);
        const isTmp = image.key.includes('/tmp/');
        const safeName = this.helpers.sanitizeFileName(image.fileName);
        const ext = image.mimeType?.startsWith('image/') && image.mimeType.includes('/')
            ? `.${image.mimeType.split('/')[1] || 'jpg'}`
            : '.jpg';
        const finalFileName = safeName && safeName.includes('.')
            ? safeName
            : safeName
                ? `${safeName}${ext}`
                : `product-${productId}-${Date.now()}${ext}`;
        const finalKey = isTmp
            ? `companies/${companyId}/products/${productId}/${finalFileName}`
            : image.key;
        const moved = isTmp
            ? await this.aws.moveObject({ fromKey: image.key, toKey: finalKey })
            : { key: finalKey, url: this.buildPublicUrl(finalKey) };
        const [row] = await tx
            .insert(schema_1.productImages)
            .values({
            companyId,
            productId,
            variantId: null,
            url: moved.url,
            altText: image.altText ?? `${productName} product image`,
            fileName: image.fileName ?? finalFileName ?? null,
            mimeType: (image.mimeType ?? 'image/jpeg').trim() || 'image/jpeg',
            size: null,
            width: null,
            height: null,
            position: image.position ?? 0,
        })
            .returning({ id: schema_1.productImages.id })
            .execute();
        return row;
    }
    async createProduct(companyId, dto, user, ip) {
        await this.helpers.assertCompanyExists(companyId);
        const slug = this.helpers.toSlug(dto.slug ?? dto.name);
        await this.helpers.ensureSlugUnique(companyId, slug);
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
        const linksByType = dto.links ?? {};
        const productType = dto.productType ?? 'simple';
        const maxImages = productType === 'variable' ? 1 : 9;
        if (dto.images?.length && dto.images.length > maxImages) {
            throw new common_1.BadRequestException(`Too many images. Max is ${maxImages}.`);
        }
        const safeDefaultIndex = productType === 'variable' ? 0 : (dto.defaultImageIndex ?? 0);
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
                seoDescription: dto.seoDescription ?? null,
                metadata: dto.metadata ?? {},
            })
                .returning()
                .execute();
            if (dto.images?.length) {
                const inserted = [];
                for (let i = 0; i < dto.images.length; i++) {
                    const img = dto.images[i];
                    if (!img?.key)
                        throw new common_1.BadRequestException('Image must include key');
                    const row = await this.insertImageFromKey({
                        tx,
                        companyId,
                        productId: product.id,
                        productName: product.name,
                        image: {
                            key: img.key,
                            mimeType: img.mimeType,
                            fileName: img.fileName,
                            altText: img.altText,
                            position: img.position ?? i,
                        },
                    });
                    inserted.push(row);
                }
                const chosen = inserted[safeDefaultIndex] ?? inserted[0];
                if (chosen) {
                    await tx
                        .update(schema_1.products)
                        .set({ defaultImageId: chosen.id, updatedAt: new Date() })
                        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, product.id)))
                        .execute();
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
                    imagesCount: dto.images?.length ?? 0,
                    defaultImageIndex: safeDefaultIndex,
                },
            });
        }
        return created;
    }
    async updateProduct(companyId, productId, dto, user, ip) {
        const existing = await this.helpers.findProductByIdOrThrow(companyId, productId);
        let slug = existing.slug;
        if (dto.slug) {
            slug = this.helpers.toSlug(dto.slug);
            if (slug !== existing.slug) {
                await this.helpers.ensureSlugUnique(companyId, slug, productId);
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
                const incoming = Array.isArray(dto.images)
                    ? dto.images.slice(0, maxImages)
                    : [];
                const currentImages = await tx
                    .select({ id: schema_1.productImages.id, url: schema_1.productImages.url })
                    .from(schema_1.productImages)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
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
                    const row = await this.insertImageFromKey({
                        tx,
                        companyId,
                        productId,
                        productName: p.name,
                        image: {
                            key,
                            mimeType: img.mimeType,
                            fileName: img.fileName,
                            altText: img.altText,
                            position: typeof img.position === 'number' ? img.position : i,
                        },
                    });
                    inserted.push(row);
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
                },
            });
        }
        return updated;
    }
    async deleteProduct(companyId, productId, user, ip) {
        const existing = await this.helpers.findProductByIdOrThrow(companyId, productId);
        const [deleted] = await this.db
            .update(schema_1.products)
            .set({ deletedAt: new Date(), status: 'archived' })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Product not found');
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
        await this.helpers.findProductByIdOrThrow(companyId, productId);
        const categoryIds = dto.categoryIds ?? [];
        if (categoryIds.length) {
            const cats = await this.db
                .select({ id: schema_1.categories.id })
                .from(schema_1.categories)
                .where((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId))
                .execute();
            const validIds = new Set(cats.map((c) => c.id));
            const invalid = categoryIds.filter((id) => !validIds.has(id));
            if (invalid.length) {
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
                changes: { companyId, productId, categoryIds },
            });
        }
        return inserted;
    }
};
exports.ProductsMutationsService = ProductsMutationsService;
exports.ProductsMutationsService = ProductsMutationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        categories_service_1.CategoriesService,
        linked_products_service_1.LinkedProductsService,
        aws_service_1.AwsService,
        config_1.ConfigService,
        products_helpers_service_1.ProductsHelpersService])
], ProductsMutationsService);
//# sourceMappingURL=products-mutations.service.js.map