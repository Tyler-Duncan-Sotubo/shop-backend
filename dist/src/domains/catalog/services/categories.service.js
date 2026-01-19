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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const slugify_1 = require("../utils/slugify");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
const id_1 = require("../../../infrastructure/drizzle/id");
const media_service_1 = require("../../media/media.service");
let CategoriesService = class CategoriesService {
    constructor(db, cache, audit, aws, mediaService) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
        this.aws = aws;
        this.mediaService = mediaService;
    }
    async assertCompanyExists(companyId) {
        const company = await this.db.query.companies.findFirst({
            where: (0, drizzle_orm_1.eq)(schema_1.companies.id, companyId),
        });
        if (!company)
            throw new common_1.NotFoundException('Company not found');
        return company;
    }
    async assertProductBelongsToCompany(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product not found for company ${companyId}`);
        }
        return product;
    }
    async findCategoryByIdOrThrow(companyId, categoryId) {
        const category = await this.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)),
        });
        if (!category) {
            throw new common_1.NotFoundException(`Category not found for company ${companyId}`);
        }
        return category;
    }
    async assertCategoriesBelongToCompany(companyId, categoryIds) {
        if (!categoryIds.length)
            return;
        const rows = await this.db
            .select({ id: schema_1.categories.id })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.inArray)(schema_1.categories.id, categoryIds)))
            .execute();
        const found = new Set(rows.map((r) => r.id));
        const missing = categoryIds.filter((id) => !found.has(id));
        if (missing.length > 0) {
            throw new common_1.BadRequestException(`Some categories do not belong to this company: ${missing.join(', ')}`);
        }
    }
    async assertParentValid(companyId, parentId, categoryIdBeingUpdated) {
        if (!parentId)
            return;
        if (categoryIdBeingUpdated && parentId === categoryIdBeingUpdated) {
            throw new common_1.BadRequestException('Category cannot have itself as parent');
        }
        const parent = await this.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, parentId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)),
            columns: { id: true },
        });
        if (!parent)
            throw new common_1.BadRequestException('Parent category not found');
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
    async createMediaFromBase64OrThrow(params) {
        const { companyId, storeId, base64Image } = params;
        const mimeType = (params.mimeType ?? 'image/jpeg').trim() || 'image/jpeg';
        const safeProvidedName = this.sanitizeFileName(params.fileNameHint);
        const extFromMime = mimeType.startsWith('image/')
            ? `.${mimeType.split('/')[1] || 'jpg'}`
            : '.bin';
        const fileName = safeProvidedName && safeProvidedName.includes('.')
            ? safeProvidedName
            : safeProvidedName
                ? `${safeProvidedName}${extFromMime}`
                : `category-${Date.now()}${extFromMime}`;
        const normalized = base64Image.includes(',')
            ? base64Image.split(',')[1]
            : base64Image;
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
        const url = await this.aws.uploadImageToS3(companyId, fileName, base64Image);
        const storageKey = this.extractStorageKeyFromUrl(url);
        const [row] = await this.db
            .insert(schema_1.media)
            .values({
            id: (0, id_1.defaultId)(),
            companyId,
            storeId,
            fileName,
            mimeType,
            url,
            storageKey: storageKey ?? null,
            size,
            width,
            height,
            altText: params.altText ?? null,
            folder: params.folder ?? 'categories',
            tag: params.tag ?? null,
        })
            .returning({ id: schema_1.media.id, url: schema_1.media.url })
            .execute();
        if (!row)
            throw new common_1.BadRequestException('Failed to create media');
        return row;
    }
    async assertMediaBelongsToCompanyAndStore(params) {
        const m = await this.db.query.media.findFirst({
            where: (mm, { and, eq, isNull }) => and(eq(mm.id, params.mediaId), eq(mm.companyId, params.companyId), eq(mm.storeId, params.storeId), isNull(mm.deletedAt)),
            columns: { id: true },
        });
        if (!m)
            throw new common_1.BadRequestException('Invalid mediaId for this store/company');
        return m;
    }
    async listCategoriesAdmin(companyId, storeId) {
        await this.assertCompanyExists(companyId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'categories', 'adminList', storeId], async () => {
            const rows = await this.db
                .select({
                id: schema_1.categories.id,
                name: schema_1.categories.name,
                slug: schema_1.categories.slug,
                parentId: schema_1.categories.parentId,
                position: schema_1.categories.position,
                isActive: schema_1.categories.isActive,
                productCount: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.productCategories.productId})`,
                imageUrl: schema_1.media.url,
            })
                .from(schema_1.categories)
                .leftJoin(schema_1.productCategories, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, schema_1.categories.id)))
                .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
                .groupBy(schema_1.categories.id, schema_1.categories.name, schema_1.categories.slug, schema_1.categories.parentId, schema_1.categories.position, schema_1.categories.isActive, schema_1.media.url)
                .orderBy(schema_1.categories.position, schema_1.categories.name)
                .execute();
            return rows.map((r) => ({
                ...r,
                productCount: Number(r.productCount ?? 0),
            }));
        });
    }
    async getCategoryAdmin(companyId, storeId, categoryId) {
        await this.assertCompanyExists(companyId);
        const row = await this.db
            .select({
            id: schema_1.categories.id,
            name: schema_1.categories.name,
            slug: schema_1.categories.slug,
            parentId: schema_1.categories.parentId,
            description: schema_1.categories.description,
            afterContentHtml: schema_1.categories.afterContentHtml,
            metaTitle: schema_1.categories.metaTitle,
            metaDescription: schema_1.categories.metaDescription,
            position: schema_1.categories.position,
            isActive: schema_1.categories.isActive,
            createdAt: schema_1.categories.createdAt,
            updatedAt: schema_1.categories.updatedAt,
            imageMediaId: schema_1.categories.imageMediaId,
            imageUrl: schema_1.media.url,
            imageAltText: schema_1.media.altText,
        })
            .from(schema_1.categories)
            .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
            .limit(1)
            .execute()
            .then((r) => r[0]);
        if (!row)
            throw new common_1.NotFoundException('Category not found');
        return row;
    }
    async listCategoryProductsAdmin(companyId, storeId, categoryId, opts) {
        const limit = opts?.limit ?? 50;
        const offset = opts?.offset ?? 0;
        const search = opts?.search?.trim();
        const whereClauses = [
            (0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, categoryId),
            (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId),
            (0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`,
        ];
        if (search)
            whereClauses.push((0, drizzle_orm_1.ilike)(schema_1.products.name, `%${search}%`));
        return this.db
            .select({
            id: schema_1.products.id,
            name: schema_1.products.name,
            status: schema_1.products.status,
            imageUrl: schema_1.productImages.url,
            pinned: schema_1.productCategories.pinned,
            position: schema_1.productCategories.position,
        })
            .from(schema_1.productCategories)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productCategories.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productCategories.productId)))
            .leftJoin(schema_1.productImages, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, schema_1.products.companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, schema_1.products.defaultImageId), (0, drizzle_orm_1.sql) `${schema_1.productImages.deletedAt} IS NULL`))
            .where((0, drizzle_orm_1.and)(...whereClauses))
            .orderBy((0, drizzle_orm_1.sql) `${schema_1.productCategories.pinned} DESC`, (0, drizzle_orm_1.sql) `${schema_1.productCategories.position} ASC`, (0, drizzle_orm_1.sql) `${schema_1.products.createdAt} DESC`)
            .limit(limit)
            .offset(offset)
            .execute();
    }
    async getCategoryAdminWithProducts(companyId, storeId, categoryId, opts) {
        const limit = opts?.limit ?? 50;
        const offset = opts?.offset ?? 0;
        const search = opts?.search?.trim();
        await this.assertCompanyExists(companyId);
        const category = await this.getCategoryAdmin(companyId, storeId, categoryId);
        const whereCount = [
            (0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, categoryId),
            (0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId),
            (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId),
            (0, drizzle_orm_1.sql) `${schema_1.products.deletedAt} IS NULL`,
        ];
        if (search)
            whereCount.push((0, drizzle_orm_1.ilike)(schema_1.products.name, `%${search}%`));
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `COUNT(DISTINCT ${schema_1.products.id})` })
            .from(schema_1.productCategories)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, schema_1.productCategories.companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.productCategories.productId)))
            .where((0, drizzle_orm_1.and)(...whereCount))
            .execute();
        const total = Number(count ?? 0);
        const productsList = await this.listCategoryProductsAdmin(companyId, storeId, categoryId, { limit, offset, search });
        return {
            category,
            products: productsList,
            total,
            limit,
            offset,
        };
    }
    async reorderCategoryProducts(companyId, categoryId, items) {
        if (!items.length)
            return { success: true };
        await this.db.transaction(async (tx) => {
            for (const it of items) {
                await tx
                    .update(schema_1.productCategories)
                    .set({
                    position: it.position,
                    ...(it.pinned !== undefined ? { pinned: it.pinned } : {}),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, categoryId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, it.productId)))
                    .execute();
            }
        });
        await this.cache.bumpCompanyVersion(companyId);
        return { success: true };
    }
    async getCategories(companyId, storeId) {
        await this.assertCompanyExists(companyId);
        if (!storeId)
            return [];
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'categories', storeId], async () => {
            return this.db
                .select({
                id: schema_1.categories.id,
                companyId: schema_1.categories.companyId,
                storeId: schema_1.categories.storeId,
                parentId: schema_1.categories.parentId,
                name: schema_1.categories.name,
                slug: schema_1.categories.slug,
                description: schema_1.categories.description,
                afterContentHtml: schema_1.categories.afterContentHtml,
                metaTitle: schema_1.categories.metaTitle,
                metaDescription: schema_1.categories.metaDescription,
                position: schema_1.categories.position,
                isActive: schema_1.categories.isActive,
                createdAt: schema_1.categories.createdAt,
                updatedAt: schema_1.categories.updatedAt,
                imageMediaId: schema_1.categories.imageMediaId,
                imageUrl: schema_1.media.url,
                imageAltText: schema_1.media.altText,
            })
                .from(schema_1.categories)
                .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
                .execute();
        });
    }
    async getCategoriesWithLimit(companyId, storeId, limit) {
        await this.assertCompanyExists(companyId);
        if (!storeId)
            return [];
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'categories', storeId, 'limit', (limit ?? 'all').toString()], async () => {
            const baseQuery = this.db
                .select({
                id: schema_1.categories.id,
                name: schema_1.categories.name,
                slug: schema_1.categories.slug,
                imageUrl: schema_1.media.url,
                imageAltText: schema_1.media.altText,
                parentId: schema_1.categories.parentId,
                hasChildren: (0, drizzle_orm_1.sql) `
            exists (
              select 1
              from ${schema_1.categories} as child
              where
                child.company_id = ${companyId}
                and child.store_id = ${storeId}
                and child.parent_id = ${schema_1.categories.id}
                and child.deleted_at is null
            )
          `.as('hasChildren'),
            })
                .from(schema_1.categories)
                .leftJoin(schema_1.media, (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, schema_1.categories.companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, schema_1.categories.storeId), (0, drizzle_orm_1.eq)(schema_1.media.id, schema_1.categories.imageMediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)))
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
                .orderBy(schema_1.categories.position);
            if (typeof limit === 'number') {
                return baseQuery.limit(limit).execute();
            }
            return baseQuery.execute();
        });
    }
    async createCategory(companyId, dto, user, ip) {
        await this.assertCompanyExists(companyId);
        if (!dto.storeId) {
            throw new common_1.BadRequestException('storeId is required to create categories');
        }
        if (dto.parentId) {
            await this.assertParentValid(companyId, dto.parentId);
        }
        const slug = dto.slug && dto.slug.trim().length > 0
            ? (0, slugify_1.slugify)(dto.slug)
            : (0, slugify_1.slugify)(dto.name);
        const existing = await this.db.query.categories.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.slug, slug), (0, drizzle_orm_1.eq)(schema_1.categories.storeId, dto.storeId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)),
            columns: { id: true },
        });
        if (existing)
            throw new common_1.BadRequestException('Category slug must be unique');
        const { imageMediaId, uploadKey, uploadUrl, imageFileName, imageMimeType, imageAltText, } = dto;
        if (imageMediaId && uploadKey) {
            throw new common_1.BadRequestException('Provide either imageMediaId OR uploadKey/uploadUrl, not both.');
        }
        let finalMediaId = null;
        if (imageMediaId) {
            await this.assertMediaBelongsToCompanyAndStore({
                companyId,
                storeId: dto.storeId,
                mediaId: imageMediaId,
            });
            finalMediaId = imageMediaId;
        }
        else if (uploadKey) {
            if (!uploadUrl || !imageFileName || !imageMimeType) {
                throw new common_1.BadRequestException('uploadKey requires uploadUrl, imageFileName, imageMimeType');
            }
            const finalized = await this.mediaService.finalizeMediaUpload({
                companyId,
                storeId: dto.storeId,
                key: uploadKey,
                url: uploadUrl,
                fileName: imageFileName,
                mimeType: imageMimeType,
                folder: 'categories',
                tag: slug,
                altText: imageAltText ?? `${dto.name} category image`,
            });
            finalMediaId = finalized.id;
        }
        const created = await this.db.transaction(async (tx) => {
            const [category] = await tx
                .insert(schema_1.categories)
                .values({
                companyId,
                storeId: dto.storeId,
                name: dto.name,
                slug,
                description: dto.description ?? null,
                afterContentHtml: dto.afterContentHtml ?? null,
                metaTitle: dto.metaTitle ?? null,
                metaDescription: dto.metaDescription ?? null,
                parentId: dto.parentId ?? null,
                isActive: dto.isActive ?? true,
            })
                .returning()
                .execute();
            if (finalMediaId) {
                const [updated] = await tx
                    .update(schema_1.categories)
                    .set({
                    imageMediaId: finalMediaId,
                    updatedAt: new Date(),
                })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, category.id)))
                    .returning()
                    .execute();
                return updated ?? category;
            }
            return category;
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'create',
                entity: 'category',
                entityId: created.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Created category',
                changes: {
                    companyId,
                    storeId: created.storeId,
                    name: created.name,
                    slug: created.slug,
                    parentId: created.parentId,
                    imageMediaId: created.imageMediaId ?? null,
                },
            });
        }
        return created;
    }
    async updateCategory(companyId, categoryId, dto, user, ip) {
        const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);
        if (!existing.storeId) {
            throw new common_1.BadRequestException('Category storeId is missing');
        }
        if (dto.parentId !== undefined) {
            await this.assertParentValid(companyId, dto.parentId, categoryId);
        }
        const slug = dto.slug !== undefined
            ? (0, slugify_1.slugify)(dto.slug || existing.slug)
            : existing.slug;
        if (dto.slug !== undefined && slug !== existing.slug) {
            const conflict = await this.db.query.categories.findFirst({
                where: (c, { and, eq, isNull }) => and(eq(c.companyId, companyId), eq(c.storeId, existing.storeId), eq(c.slug, slug), isNull(c.deletedAt)),
                columns: { id: true },
            });
            if (conflict && conflict.id !== categoryId) {
                throw new common_1.BadRequestException('Category slug must be unique');
            }
        }
        const { imageMediaId, uploadKey, uploadUrl, imageFileName, imageMimeType, imageAltText, removeImage, } = dto;
        if (imageMediaId && uploadKey) {
            throw new common_1.BadRequestException('Provide either imageMediaId OR uploadKey/uploadUrl, not both.');
        }
        const updated = await this.db.transaction(async (tx) => {
            const [row] = await tx
                .update(schema_1.categories)
                .set({
                name: dto.name ?? existing.name,
                slug,
                description: dto.description ?? existing.description,
                afterContentHtml: dto.afterContentHtml !== undefined
                    ? dto.afterContentHtml
                    : existing.afterContentHtml,
                metaTitle: dto.metaTitle !== undefined ? dto.metaTitle : existing.metaTitle,
                metaDescription: dto.metaDescription !== undefined
                    ? dto.metaDescription
                    : existing.metaDescription,
                parentId: dto.parentId === undefined ? existing.parentId : dto.parentId,
                isActive: dto.isActive === undefined ? existing.isActive : dto.isActive,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
                .returning()
                .execute();
            if (!row)
                throw new common_1.NotFoundException('Category not found');
            if (removeImage === true) {
                const [row2] = await tx
                    .update(schema_1.categories)
                    .set({ imageMediaId: null, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
                    .returning()
                    .execute();
                return row2 ?? row;
            }
            if (imageMediaId) {
                await this.assertMediaBelongsToCompanyAndStore({
                    companyId,
                    storeId: existing.storeId,
                    mediaId: imageMediaId,
                });
                const [row2] = await tx
                    .update(schema_1.categories)
                    .set({ imageMediaId: imageMediaId, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
                    .returning()
                    .execute();
                return row2 ?? row;
            }
            if (uploadKey) {
                if (!uploadUrl || !imageFileName || !imageMimeType) {
                    throw new common_1.BadRequestException('uploadKey requires uploadUrl, imageFileName, imageMimeType');
                }
                const finalized = await this.mediaService.finalizeMediaUpload({
                    companyId,
                    storeId: existing.storeId,
                    key: uploadKey,
                    url: uploadUrl,
                    fileName: imageFileName,
                    mimeType: imageMimeType,
                    folder: 'categories',
                    tag: slug,
                    altText: imageAltText ?? `${row.name} category image`,
                });
                const [row2] = await tx
                    .update(schema_1.categories)
                    .set({ imageMediaId: finalized.id, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
                    .returning()
                    .execute();
                return row2 ?? row;
            }
            return row;
        });
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'category',
                entityId: updated.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated category',
                changes: { before: existing, after: updated },
            });
        }
        return updated;
    }
    async deleteCategory(companyId, categoryId, user, ip) {
        const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);
        const children = await this.db
            .select({ id: schema_1.categories.id })
            .from(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.parentId, categoryId), (0, drizzle_orm_1.isNull)(schema_1.categories.deletedAt)))
            .limit(1)
            .execute();
        if (children.length > 0) {
            throw new common_1.BadRequestException('Cannot delete category: it has child categories. Delete or reassign children first.');
        }
        const [deleted] = await this.db
            .delete(schema_1.categories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.categories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.categories.id, categoryId)))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Category not found');
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'delete',
                entity: 'category',
                entityId: categoryId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted category',
                changes: {
                    companyId,
                    storeId: existing.storeId,
                    name: existing.name,
                    slug: existing.slug,
                },
            });
        }
        return { success: true };
    }
    async getProductCategories(companyId, productId) {
        await this.assertProductBelongsToCompany(companyId, productId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'product', productId, 'categories'], async () => {
            return this.db
                .select()
                .from(schema_1.productCategories)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId)))
                .execute();
        });
    }
    async assignCategoriesToProduct(companyId, productId, dto, user, ip) {
        await this.assertProductBelongsToCompany(companyId, productId);
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
        await this.assertCategoriesBelongToCompany(companyId, uniqueCategoryIds);
        await this.db
            .delete(schema_1.productCategories)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId)))
            .execute();
        let inserted = [];
        if (uniqueCategoryIds.length) {
            inserted = await this.db
                .insert(schema_1.productCategories)
                .values(uniqueCategoryIds.map((categoryId) => ({
                companyId,
                productId,
                categoryId,
            })))
                .returning()
                .execute();
        }
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'product_categories',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated categories assigned to product',
                changes: {
                    companyId,
                    productId,
                    categoryIds: uniqueCategoryIds,
                },
            });
        }
        return inserted;
    }
    async syncSalesCategoryForProduct(params) {
        const companyId = params.companyId;
        const productId = params.productId;
        const salesSlug = (params.salesSlug ?? 'sale').trim() || 'sale';
        const salesName = (params.salesName ?? 'Sale').trim() || 'Sale';
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
            columns: { id: true, storeId: true },
        });
        console.log('Syncing sales category for product', { companyId, productId });
        if (!product)
            throw new common_1.BadRequestException('Product not found');
        const storeId = params.storeId ?? product.storeId;
        if (!storeId) {
            throw new common_1.BadRequestException('storeId is required to sync sales category');
        }
        const hasSaleRow = await this.db
            .select({ one: (0, drizzle_orm_1.sql) `1` })
            .from(schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.productId, productId), (0, drizzle_orm_1.isNull)(schema_1.productVariants.deletedAt), (0, drizzle_orm_1.sql) `${schema_1.productVariants.salePrice} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_1.productVariants.salePrice} > 0`))
            .limit(1)
            .execute();
        const shouldBeOnSale = hasSaleRow.length > 0;
        let salesCategory = await this.db.query.categories.findFirst({
            where: (c, { and, eq, isNull }) => and(eq(c.companyId, companyId), eq(c.storeId, storeId), eq(c.slug, salesSlug), isNull(c.deletedAt)),
            columns: { id: true },
        });
        if (!salesCategory) {
            const [created] = await this.db
                .insert(schema_1.categories)
                .values({
                companyId,
                storeId,
                name: salesName,
                slug: salesSlug,
                isActive: true,
                description: null,
                parentId: null,
            })
                .returning({ id: schema_1.categories.id })
                .execute();
            salesCategory = created;
        }
        const link = await this.db.query.productCategories.findFirst({
            where: (pc, { and, eq }) => and(eq(pc.companyId, companyId), eq(pc.productId, productId), eq(pc.categoryId, salesCategory.id)),
            columns: { categoryId: true },
        });
        let changed = false;
        if (shouldBeOnSale) {
            if (!link) {
                await this.db.insert(schema_1.productCategories).values({
                    companyId,
                    productId,
                    categoryId: salesCategory.id,
                });
                changed = true;
            }
        }
        else {
            if (link) {
                await this.db
                    .delete(schema_1.productCategories)
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productCategories.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productCategories.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productCategories.categoryId, salesCategory.id)))
                    .execute();
                changed = true;
            }
        }
        if (changed) {
            await this.cache.bumpCompanyVersion(companyId);
        }
        return { salesCategoryId: salesCategory.id, shouldBeOnSale, changed };
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        aws_service_1.AwsService,
        media_service_1.MediaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map