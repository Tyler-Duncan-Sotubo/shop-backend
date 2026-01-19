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
const aws_service_1 = require("../../infrastructure/aws/aws.service");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
const cache_service_1 = require("../../infrastructure/cache/cache.service");
const id_1 = require("../../infrastructure/drizzle/id");
const png_to_ico_1 = require("png-to-ico");
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
    sanitizeFileName(name) {
        return (name || 'upload')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .slice(0, 120);
    }
    async presignMediaUploads(params) {
        const { companyId, files, storeId, folder = 'files', expiresInSeconds = 300, publicRead = true, } = params;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (!Array.isArray(files) || !files.length) {
            throw new common_1.BadRequestException('files is required');
        }
        const uploads = await Promise.all(files.map(async (f) => {
            const mimeType = (f.mimeType || 'application/octet-stream').trim()
                ? (f.mimeType || 'application/octet-stream').trim()
                : 'application/octet-stream';
            const cleanName = this.sanitizeFileName(f.fileName);
            const extFromMime = mimeType.includes('/')
                ? `.${mimeType.split('/')[1] || 'bin'}`
                : '.bin';
            const finalName = cleanName.includes('.')
                ? cleanName
                : `${cleanName}${extFromMime}`;
            const key = storeId
                ? `companies/${companyId}/stores/${storeId}/media/${folder}/tmp/${(0, id_1.defaultId)()}-${finalName}`
                : `companies/${companyId}/media/${folder}/tmp/${(0, id_1.defaultId)()}-${finalName}`;
            return this.aws.createPresignedPutUrl({
                key,
                contentType: mimeType,
                expiresInSeconds,
                publicRead,
            });
        }));
        return { uploads };
    }
    async finalizeMediaUpload(params) {
        const { companyId, storeId, key, url, fileName, mimeType, folder = 'files', tag = 'file-upload', altText = null, } = params;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (!storeId)
            throw new common_1.BadRequestException('storeId is required');
        if (!key?.trim())
            throw new common_1.BadRequestException('key is required');
        let head;
        try {
            head = await this.aws.headObject(key);
        }
        catch {
            throw new common_1.BadRequestException('Uploaded object not found in storage');
        }
        const finalMimeType = (mimeType ?? head.contentType ?? 'application/octet-stream').trim() ||
            'application/octet-stream';
        const finalSize = typeof head.contentLength === 'number' ? head.contentLength : null;
        const payload = {
            id: (0, id_1.defaultId)(),
            companyId,
            storeId,
            fileName: fileName ?? '',
            mimeType: finalMimeType,
            url: url?.trim() || this.aws.publicUrlForKey(key),
            storageKey: key,
            size: finalSize,
            width: null,
            height: null,
            altText,
            folder,
            tag,
        };
        const [created] = await this.db.insert(schema_1.media).values(payload).returning();
        await this.cache.bumpCompanyVersion(companyId);
        return created;
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
            catch { }
        }
        return {
            id: (0, id_1.defaultId)(),
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
    async presignProductUploads(params) {
        const { companyId, files, expiresInSeconds = 300, publicRead = true, } = params;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (!Array.isArray(files) || !files.length) {
            throw new common_1.BadRequestException('files is required');
        }
        const uploads = await Promise.all(files.map(async (f) => {
            const mimeType = (f.mimeType || 'image/jpeg').trim() || 'image/jpeg';
            const cleanName = this.sanitizeFileName(f.fileName);
            const extFromMime = mimeType.startsWith('image/')
                ? `.${mimeType.split('/')[1] || 'jpg'}`
                : '.bin';
            const finalName = cleanName.includes('.')
                ? cleanName
                : `${cleanName}${extFromMime}`;
            const key = `companies/${companyId}/products/tmp/${(0, id_1.defaultId)()}-${finalName}`;
            return this.aws.createPresignedPutUrl({
                key,
                contentType: mimeType,
                expiresInSeconds,
                publicRead,
            });
        }));
        return { uploads };
    }
    async generateFaviconsFromIcon(params) {
        const { companyId, storeId, sourceUrl, folder = 'seo/favicons' } = params;
        if (!companyId)
            throw new common_1.BadRequestException('companyId is required');
        if (!storeId)
            throw new common_1.BadRequestException('storeId is required');
        if (!sourceUrl)
            throw new common_1.BadRequestException('sourceUrl is required');
        const sourceKey = this.extractStorageKeyFromUrl(sourceUrl);
        if (!sourceKey)
            throw new common_1.BadRequestException('Could not extract storage key from sourceUrl');
        const { buffer: inputBuffer } = await this.aws.getObjectBuffer(sourceKey);
        const sharpMod = await Promise.resolve().then(() => require('sharp'));
        const sharpFn = sharpMod.default ?? sharpMod;
        const base = sharpFn(inputBuffer).resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        });
        const png32 = await base.clone().resize(32, 32).png().toBuffer();
        const png16 = await base.clone().resize(16, 16).png().toBuffer();
        const icoBuffer = await (0, png_to_ico_1.default)([png16, png32]);
        const appleTouch = await base.clone().resize(180, 180).png().toBuffer();
        const stamp = Date.now();
        const key32 = `companies/${companyId}/stores/${storeId}/media/${folder}/favicon-32-${stamp}.png`;
        const key16 = `companies/${companyId}/stores/${storeId}/media/${folder}/favicon-16-${stamp}.png`;
        const keyApple = `companies/${companyId}/stores/${storeId}/media/${folder}/apple-touch-${stamp}.png`;
        const { url: url32 } = await this.aws.uploadPublicObject({
            key: key32,
            body: png32,
            contentType: 'image/png',
        });
        const { url: url16 } = await this.aws.uploadPublicObject({
            key: key16,
            body: png16,
            contentType: 'image/png',
        });
        const { url: urlApple } = await this.aws.uploadPublicObject({
            key: keyApple,
            body: appleTouch,
            contentType: 'image/png',
        });
        const icoKey = `companies/${companyId}/stores/${storeId}/media/${folder}/favicon-${stamp}.ico`;
        const { url: icoUrl } = await this.aws.uploadPublicObject({
            key: icoKey,
            body: icoBuffer,
            contentType: 'image/x-icon',
        });
        const insertRow = async (args) => {
            const payload = {
                id: (0, id_1.defaultId)(),
                companyId,
                storeId,
                fileName: args.fileName,
                mimeType: 'image/png',
                url: args.url,
                storageKey: args.key,
                size: null,
                width: null,
                height: null,
                altText: 'Favicon',
                folder,
                tag: args.tag,
            };
            await this.db.insert(schema_1.media).values(payload);
        };
        await insertRow({
            key: key32,
            url: url32,
            fileName: `favicon-32.png`,
            tag: 'favicon',
        });
        await insertRow({
            key: key16,
            url: url16,
            fileName: `favicon-16.png`,
            tag: 'favicon',
        });
        await insertRow({
            key: keyApple,
            url: urlApple,
            fileName: `apple-touch-icon.png`,
            tag: 'favicon',
        });
        await insertRow({
            key: icoKey,
            url: icoUrl,
            fileName: 'favicon.ico',
            tag: 'favicon',
        });
        await this.cache.bumpCompanyVersion(companyId);
        return {
            favicon: {
                png: url32,
                appleTouch: urlApple,
                ico: icoUrl,
                svg: null,
                png16: url16,
            },
        };
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