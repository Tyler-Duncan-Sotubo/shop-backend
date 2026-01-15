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
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const aws_service_1 = require("../../common/aws/aws.service");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const schema_1 = require("../../drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../common/cache/cache.service");
let MediaService = class MediaService {
    constructor(aws, cache, db) {
        this.aws = aws;
        this.cache = cache;
        this.db = db;
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
    async buildMediaPayload(params) {
        const { companyId, base64, fileName, mimeType } = params;
        const url = await this.aws.uploadImageToS3(companyId, fileName, base64);
        const normalized = base64.includes(',') ? base64.split(',')[1] : base64;
        const buffer = Buffer.from(normalized, 'base64');
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
        return {
            companyId: params.companyId,
            storeId: params.storeId,
            fileName: params.fileName,
            mimeType: params.mimeType,
            url,
            storageKey: null,
            size: buffer.byteLength,
            width,
            height,
            altText: params.altText ?? null,
            folder: params.folder,
            tag: params.tag ?? null,
        };
    }
    async uploadEditorImage(companyId, dto) {
        const { base64, storeId } = dto;
        const payload = await this.buildMediaPayload({
            companyId,
            storeId,
            base64,
            fileName: `editor-${Date.now()}.jpg`,
            mimeType: 'image/jpeg',
            folder: 'editor',
            tag: 'editor-image',
            altText: null,
        });
        const [created] = await this.db.insert(schema_1.media).values(payload).returning();
        await this.cache.bumpCompanyVersion(companyId);
        return created;
    }
    async uploadMediaFile(companyId, dto) {
        const { base64, fileName, mimeType, storeId } = dto;
        const payload = await this.buildMediaPayload({
            companyId,
            storeId,
            base64,
            fileName,
            mimeType,
            folder: 'files',
            tag: 'file-upload',
            altText: null,
        });
        const [created] = await this.db.insert(schema_1.media).values(payload).returning();
        await this.cache.bumpCompanyVersion(companyId);
        return {
            url: created.url,
            altText: created.altText,
        };
    }
    async getMedia(companyId, query) {
        const { storeId, search, limit = 20 } = query;
        const generalMedia = await this.db
            .select({
            id: schema_1.media.id,
            url: schema_1.media.url,
            fileName: schema_1.media.fileName,
            mimeType: schema_1.media.mimeType,
            createdAt: schema_1.media.createdAt,
            source: (0, drizzle_orm_1.sql) `'media'`,
            size: schema_1.media.size,
        })
            .from(schema_1.media)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.media.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt), search ? (0, drizzle_orm_1.ilike)(schema_1.media.fileName, `%${search}%`) : undefined));
        const images = await this.db
            .select({
            id: schema_1.productImages.id,
            url: schema_1.productImages.url,
            createdAt: schema_1.productImages.createdAt,
            fileName: schema_1.productImages.fileName,
            mimeType: schema_1.productImages.mimeType,
            size: schema_1.productImages.size,
        })
            .from(schema_1.productImages)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.productImages.productId, schema_1.products.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt), search ? (0, drizzle_orm_1.ilike)(schema_1.productImages.fileName, `%${search}%`) : undefined));
        return [...generalMedia, ...images]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }
    async removeMedia(companyId, mediaId) {
        const row = await this.db.query.media.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.media.id, mediaId), (0, drizzle_orm_1.isNull)(schema_1.media.deletedAt)),
        });
        if (!row)
            throw new common_1.NotFoundException('Media file not found');
        const storageKey = row.storageKey ?? this.extractStorageKeyFromUrl(row.url) ?? null;
        if (!storageKey) {
            throw new common_1.BadRequestException('Cannot delete file from storage: missing storageKey');
        }
        await this.aws.deleteFromS3(storageKey);
        const [deleted] = await this.db
            .delete(schema_1.media)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.media.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.media.id, mediaId)))
            .returning();
        if (!deleted)
            throw new common_1.NotFoundException('Media file not found');
        await this.cache.bumpCompanyVersion(companyId);
        return { success: true, id: deleted.id };
    }
    async removeProductImage(companyId, storeId, imageId) {
        const row = await this.db
            .select({
            id: schema_1.productImages.id,
            url: schema_1.productImages.url,
            fileName: schema_1.productImages.fileName,
            productId: schema_1.productImages.productId,
            companyId: schema_1.productImages.companyId,
        })
            .from(schema_1.productImages)
            .innerJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.productImages.productId, schema_1.products.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, imageId), (0, drizzle_orm_1.eq)(schema_1.products.storeId, storeId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
            .then((r) => r[0]);
        if (!row)
            throw new common_1.NotFoundException('Product image not found');
        const storageKey = this.extractStorageKeyFromUrl(row.url);
        if (!storageKey) {
            throw new common_1.BadRequestException('Cannot delete file from storage: missing storageKey');
        }
        await this.aws.deleteFromS3(storageKey);
        const [deleted] = await this.db
            .update(schema_1.productImages)
            .set({
            deletedAt: new Date(),
        })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.id, imageId)))
            .returning();
        if (!deleted)
            throw new common_1.NotFoundException('Product image not found');
        await this.cache.bumpCompanyVersion(companyId);
        return { success: true, id: deleted.id };
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [aws_service_1.AwsService,
        cache_service_1.CacheService, Object])
], MediaService);
//# sourceMappingURL=media.service.js.map