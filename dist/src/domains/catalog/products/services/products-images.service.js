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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsImagesService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../../../../infrastructure/drizzle/schema");
const aws_service_1 = require("../../../../infrastructure/aws/aws.service");
const config_1 = require("@nestjs/config");
const products_helpers_service_1 = require("./products-helpers.service");
let ProductsImagesService = class ProductsImagesService {
    constructor(aws, config, helpers) {
        this.aws = aws;
        this.config = config;
        this.helpers = helpers;
    }
    inferExt(mimeType) {
        if (mimeType?.startsWith('image/'))
            return `.${mimeType.split('/')[1] || 'jpg'}`;
        return '.jpg';
    }
    buildPublicUrl(bucket, key) {
        return `https://${bucket}.s3.amazonaws.com/${key}`;
    }
    async createFromS3Key(opts) {
        const { tx, companyId, productId, productName, image } = opts;
        this.helpers.assertS3KeyAllowed(companyId, image.key);
        await this.aws.assertObjectExists(image.key);
        const isTmp = image.key.includes('/tmp/');
        const safeName = this.helpers.sanitizeFileName(image.fileName);
        const ext = this.inferExt(image.mimeType);
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
            : {
                key: finalKey,
                url: image.url ??
                    this.buildPublicUrl(this.config.get('AWS_BUCKET_NAME'), finalKey),
            };
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
            .returning({ id: schema_1.productImages.id, url: schema_1.productImages.url })
            .execute();
        return row;
    }
    async replaceProductImages(opts) {
        const { tx, companyId, productId, productName, nextProductType } = opts;
        const maxImages = nextProductType === 'variable' ? 1 : 9;
        const incoming = (opts.images ?? []).slice(0, maxImages);
        const currentImages = await tx
            .select({ id: schema_1.productImages.id, url: schema_1.productImages.url })
            .from(schema_1.productImages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.productImages.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.productImages.productId, productId), (0, drizzle_orm_1.isNull)(schema_1.productImages.deletedAt)))
            .execute();
        const inserted = [];
        for (let i = 0; i < incoming.length; i++) {
            const img = incoming[i];
            const key = img.key ?? (img.url ? this.aws.extractKeyFromUrl(img.url) : null);
            if (!key)
                throw new common_1.BadRequestException('Image must include key or url');
            const row = await this.createFromS3Key({
                tx,
                companyId,
                productId,
                productName,
                image: {
                    ...img,
                    key,
                    position: typeof img.position === 'number' ? img.position : i,
                },
            });
            inserted.push(row);
        }
        const safeDefaultIndex = nextProductType === 'variable' ? 0 : (opts.defaultImageIndex ?? 0);
        const chosen = inserted[safeDefaultIndex] ?? inserted[0] ?? null;
        await tx
            .update(schema_1.products)
            .set({ defaultImageId: chosen ? chosen.id : null, updatedAt: new Date() })
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
        return {
            insertedCount: inserted.length,
            defaultImageId: chosen?.id ?? null,
        };
    }
};
exports.ProductsImagesService = ProductsImagesService;
exports.ProductsImagesService = ProductsImagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [aws_service_1.AwsService,
        config_1.ConfigService,
        products_helpers_service_1.ProductsHelpersService])
], ProductsImagesService);
//# sourceMappingURL=products-images.service.js.map