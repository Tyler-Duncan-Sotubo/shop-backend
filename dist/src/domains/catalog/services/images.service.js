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
exports.ImagesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../../infrastructure/drizzle/schema");
const cache_service_1 = require("../../../infrastructure/cache/cache.service");
const audit_service_1 = require("../../audit/audit.service");
const aws_service_1 = require("../../../infrastructure/aws/aws.service");
let ImagesService = class ImagesService {
    constructor(db, cache, audit, aws) {
        this.db = db;
        this.cache = cache;
        this.audit = audit;
        this.aws = aws;
    }
    async assertProductBelongsToCompany(companyId, productId) {
        const product = await this.db.query.products.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)),
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product ${productId} not found for this company`);
        }
        return product;
    }
    async assertVariantBelongsToCompany(companyId, variantId) {
        if (!variantId)
            return null;
        const variant = await this.db.query.productVariants.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, variantId)),
        });
        if (!variant) {
            throw new common_1.NotFoundException('Variant not found for this company');
        }
        return variant;
    }
    async findImageOrThrow(companyId, imageId) {
        const image = await this.db.query.productImages.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, imageId)),
        });
        if (!image) {
            throw new common_1.NotFoundException('Image not found for this company');
        }
        return image;
    }
    async getImages(companyId, productId) {
        await this.assertProductBelongsToCompany(companyId, productId);
        return this.cache.getOrSetVersioned(companyId, ['catalog', 'product', productId, 'images'], async () => {
            return this.db
                .select()
                .from(schema_1.productImages)
                .where((0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId))
                .execute();
        });
    }
    async getNextImagePosition(companyId, productId, tx = this.db) {
        const last = await tx.query.productImages.findFirst({
            where: (fields, { and, eq }) => and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
            orderBy: (fields, { desc }) => [desc(fields.position)],
        });
        return (last?.position ?? 0) + 1;
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
    sanitizeFileName(name) {
        const raw = (name ?? '').trim();
        if (!raw)
            return null;
        return raw
            .replace(/[/\\]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '');
    }
    async createImage(companyId, productId, dto, user, ip, opts) {
        const tx = opts?.tx ?? this.db;
        await this.assertProductBelongsToCompany(companyId, productId);
        if (dto.variantId) {
            await this.assertVariantBelongsToCompany(companyId, dto.variantId);
        }
        const useKey = !!dto.imageKey?.trim();
        const useBase64 = !!dto.base64Image?.trim();
        if (!useKey && !useBase64) {
            throw new common_1.BadRequestException('imageKey or base64Image is required');
        }
        const existingRow = dto.variantId
            ? await tx.query.productImages.findFirst({
                where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId), (0, drizzle_orm_1.eq)(schema_1.productImages.variantId, dto.variantId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)),
            })
            : null;
        let url;
        let fileName = null;
        let mimeType = null;
        let size = null;
        let width = null;
        let height = null;
        if (useKey) {
            const key = dto.imageKey.trim();
            try {
                await this.aws.assertObjectExists(key);
            }
            catch {
                throw new common_1.BadRequestException('Uploaded object not found in S3');
            }
            url =
                dto.imageUrl?.trim() ||
                    this.aws.publicUrlForKey?.(key) ||
                    this.aws['publicUrlForKey'](key);
            fileName = dto.fileName ?? null;
            mimeType = dto.mimeType ?? null;
        }
        else {
            const mt = (dto.mimeType ?? 'image/jpeg').trim() || 'image/jpeg';
            mimeType = mt;
            const safeProvidedName = this.sanitizeFileName(dto.fileName);
            const extFromMime = mt.startsWith('image/')
                ? `.${mt.split('/')[1] || 'jpg'}`
                : '.bin';
            const fileNameBase = safeProvidedName ?? `${productId}-${Date.now()}${extFromMime}`;
            const finalFileName = fileNameBase.includes('.')
                ? fileNameBase
                : `${fileNameBase}${extFromMime}`;
            fileName = finalFileName;
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
            size = buffer.byteLength;
            if (mt.startsWith('image/')) {
                try {
                    const sharpMod = await Promise.resolve().then(() => require('sharp'));
                    const sharpFn = sharpMod.default ?? sharpMod;
                    const meta = await sharpFn(buffer).metadata();
                    width = meta.width ?? null;
                    height = meta.height ?? null;
                }
                catch { }
            }
            url = await this.aws.uploadImageToS3(companyId, finalFileName, dto.base64Image);
        }
        let image;
        if (dto.variantId) {
            const [upserted] = await tx
                .insert(schema_1.productImages)
                .values({
                companyId,
                productId,
                variantId: dto.variantId,
                url,
                altText: dto.altText ?? null,
                position: dto.position ?? 0,
                fileName,
                mimeType,
                size,
                width,
                height,
            })
                .onConflictDoUpdate({
                target: [
                    schema_1.productImages.companyId,
                    schema_1.productImages.productId,
                    schema_1.productImages.variantId,
                ],
                set: {
                    url: (0, drizzle_orm_1.sql) `excluded.url`,
                    altText: (0, drizzle_orm_1.sql) `excluded.alt_text`,
                    position: (0, drizzle_orm_1.sql) `excluded.position`,
                    fileName: (0, drizzle_orm_1.sql) `excluded.file_name`,
                    mimeType: (0, drizzle_orm_1.sql) `excluded.mime_type`,
                    size: (0, drizzle_orm_1.sql) `excluded.size`,
                    width: (0, drizzle_orm_1.sql) `excluded.width`,
                    height: (0, drizzle_orm_1.sql) `excluded.height`,
                },
            })
                .returning()
                .execute();
            image = upserted;
            if (existingRow?.url && existingRow.url !== url) {
                const oldKey = this.aws.extractKeyFromUrl(existingRow.url);
                if (oldKey) {
                    try {
                        await this.aws.deleteFromS3(oldKey);
                    }
                    catch { }
                }
            }
        }
        else {
            const position = await this.getNextImagePosition(companyId, productId, tx);
            const [inserted] = await tx
                .insert(schema_1.productImages)
                .values({
                companyId,
                productId,
                url,
                altText: dto.altText ?? null,
                position: dto.position ?? position,
                variantId: null,
                fileName,
                mimeType,
                size,
                width,
                height,
            })
                .returning()
                .execute();
            image = inserted;
            await tx
                .update(schema_1.products)
                .set({ defaultImageId: image.id, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId), (0, drizzle_orm_1.isNull)(schema_1.products.defaultImageId)));
        }
        if (dto.variantId) {
            await tx
                .update(schema_1.productVariants)
                .set({ imageId: image.id, updatedAt: new Date() })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productVariants.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productVariants.id, dto.variantId)));
        }
        if (!opts?.skipCacheBump) {
            await this.cache.bumpCompanyVersion(companyId);
        }
        if (!opts?.skipAudit && user && ip) {
            await this.audit.logAction({
                action: 'create',
                entity: 'product_image',
                entityId: image.id,
                userId: user.id,
                ipAddress: ip,
                details: dto.variantId
                    ? 'Upserted variant image'
                    : 'Created product image',
                changes: {
                    productId,
                    variantId: dto.variantId ?? null,
                    url,
                    altText: dto.altText ?? null,
                    fileName,
                    mimeType,
                    size,
                    width,
                    height,
                },
            });
        }
        return image;
    }
    async createDefaultProductImage(companyId, productId, dto, user, ip, opts) {
        const tx = opts?.tx ?? this.db;
        await this.assertProductBelongsToCompany(companyId, productId);
        const fileName = `${productId}-default-${Date.now()}.jpg`;
        const url = await this.aws.uploadImageToS3(companyId, fileName, dto.base64Image);
        const image = await tx.transaction(async (trx) => {
            const [inserted] = await trx
                .insert(schema_1.productImages)
                .values({
                companyId,
                productId,
                variantId: null,
                url,
                altText: dto.altText ?? null,
                position: 0,
            })
                .returning()
                .execute();
            await trx
                .update(schema_1.products)
                .set({
                defaultImageId: inserted.id,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.products.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.id, productId)));
            return inserted;
        });
        if (!opts?.skipCacheBump) {
            await this.cache.bumpCompanyVersion(companyId);
        }
        if (!opts?.skipAudit && user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'product',
                entityId: productId,
                userId: user.id,
                ipAddress: ip,
                details: 'Set default product image',
                changes: {
                    productId,
                    imageId: image.id,
                    url: image.url,
                    altText: image.altText,
                },
            });
        }
        return image;
    }
    async updateImage(companyId, imageId, dto, user, ip) {
        const existing = await this.findImageOrThrow(companyId, imageId);
        if (dto.variantId) {
            await this.assertVariantBelongsToCompany(companyId, dto.variantId);
        }
        let newUrl = existing.url;
        if (dto.base64Image) {
            const fileName = `${existing.productId}-${Date.now()}.jpg`;
            newUrl = await this.aws.uploadImageToS3(companyId, fileName, dto.base64Image);
        }
        const [updated] = await this.db
            .update(schema_1.productImages)
            .set({
            url: newUrl,
            altText: dto.altText ?? existing.altText,
            position: dto.position ?? existing.position,
            variantId: dto.variantId === undefined ? existing.variantId : dto.variantId,
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, imageId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            await this.audit.logAction({
                action: 'update',
                entity: 'product_image',
                entityId: existing.id,
                userId: user.id,
                ipAddress: ip,
                details: 'Updated product image',
                changes: {
                    before: existing,
                    after: updated,
                },
            });
        }
        return updated;
    }
    async deleteImage(companyId, imageId, user, ip) {
        const existing = await this.findImageOrThrow(companyId, imageId);
        const [deleted] = await this.db
            .delete(schema_1.productImages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, imageId)))
            .returning()
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
        if (user && ip) {
            this.audit.logAction({
                action: 'delete',
                entity: 'product_image',
                entityId: imageId,
                userId: user.id,
                ipAddress: ip,
                details: 'Deleted product image',
                changes: {
                    companyId,
                    productId: existing.productId,
                    url: existing.url,
                },
            });
        }
        return deleted;
    }
};
exports.ImagesService = ImagesService;
exports.ImagesService = ImagesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        aws_service_1.AwsService])
], ImagesService);
//# sourceMappingURL=images.service.js.map