import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { products, productImages, productVariants } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateImageDto } from '../dtos/images/create-image.dto';
import { UpdateImageDto } from '../dtos/images/update-image.dto';
import { AwsService } from 'src/common/aws/aws.service';

type CreateImageOptions = {
  tx?: db;
  skipCacheBump?: boolean;
  skipAudit?: boolean;
};

@Injectable()
export class ImagesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly aws: AwsService,
  ) {}

  // --------------------- Helpers ---------------------

  async assertProductBelongsToCompany(companyId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.companyId, companyId), eq(products.id, productId)),
    });

    if (!product) {
      throw new NotFoundException(
        `Product ${productId} not found for this company`,
      );
    }

    return product;
  }

  async assertVariantBelongsToCompany(
    companyId: string,
    variantId: string | null | undefined,
  ) {
    if (!variantId) return null;

    const variant = await this.db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.companyId, companyId),
        eq(productVariants.id, variantId),
      ),
    });

    if (!variant) {
      throw new NotFoundException('Variant not found for this company');
    }

    return variant;
  }

  async findImageOrThrow(companyId: string, imageId: string) {
    const image = await this.db.query.productImages.findFirst({
      where: and(
        eq(productImages.companyId, companyId),
        eq(productImages.id, imageId),
      ),
    });

    if (!image) {
      throw new NotFoundException('Image not found for this company');
    }

    return image;
  }

  // --------------------- Get Images for Product ---------------------

  async getImages(companyId: string, productId: string) {
    await this.assertProductBelongsToCompany(companyId, productId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'product', productId, 'images'],
      async () => {
        return this.db
          .select()
          .from(productImages)
          .where(eq(productImages.productId, productId))
          .execute();
      },
    );
  }

  // images.service.ts
  private async getNextImagePosition(
    companyId: string,
    productId: string,
    tx = this.db,
  ) {
    const last = await tx.query.productImages.findFirst({
      where: (fields, { and, eq }) =>
        and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
      orderBy: (fields, { desc }) => [desc(fields.position)],
    });

    return (last?.position ?? 0) + 1;
  }

  // helpers (copy from MediaService or keep locally)
  private extractStorageKeyFromUrl(url?: string | null) {
    if (!url) return null;
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  private sanitizeFileName(name?: string | null) {
    const raw = (name ?? '').trim();
    if (!raw) return null;

    // simple sanitize: keep it filesystem-safe-ish
    return raw
      .replace(/[/\\]/g, '-') // no path traversal
      .replace(/\s+/g, '-') // spaces -> dashes
      .replace(/[^a-zA-Z0-9._-]/g, ''); // drop weird chars
  }

  // --------------------- Create Image ---------------------

  async createImage(
    companyId: string,
    productId: string,
    dto: CreateImageDto,
    user?: User,
    ip?: string,
    opts?: CreateImageOptions,
  ) {
    const tx = opts?.tx ?? this.db;

    await this.assertProductBelongsToCompany(companyId, productId);

    if (dto.variantId) {
      await this.assertVariantBelongsToCompany(companyId, dto.variantId);
    }

    // ------------------------------------------------------------
    // 1) Normalize incoming fields (match MediaService behavior)
    // ------------------------------------------------------------
    const mimeType = (dto.mimeType ?? 'image/jpeg').trim() || 'image/jpeg';

    const safeProvidedName = this.sanitizeFileName(dto.fileName);
    const extFromMime = mimeType.startsWith('image/')
      ? `.${mimeType.split('/')[1] || 'jpg'}`
      : '.bin';

    // Ensure the filename has an extension
    const fileNameBase =
      safeProvidedName ?? `${productId}-${Date.now()}${extFromMime}`;

    const fileName = fileNameBase.includes('.')
      ? fileNameBase
      : `${fileNameBase}${extFromMime}`;

    // ------------------------------------------------------------
    // 2) Decode base64 for size + dimensions (optional)
    // ------------------------------------------------------------
    const normalized = dto.base64Image.includes(',')
      ? dto.base64Image.split(',')[1]
      : dto.base64Image;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(normalized, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64Image');
    }

    const size = buffer.byteLength;

    let width: number | null = null;
    let height: number | null = null;

    if (mimeType.startsWith('image/')) {
      try {
        const sharpMod = await import('sharp');
        const sharpFn: any = (sharpMod as any).default ?? sharpMod;
        const meta = await sharpFn(buffer).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch {
        // non-fatal (same behavior as MediaService)
      }
    }

    // ------------------------------------------------------------
    // 3) Upload to S3 using *provided* filename + mimetype
    //    (If your aws.uploadImageToS3 can accept mimetype, pass it)
    // ------------------------------------------------------------
    const url = await this.aws.uploadImageToS3(
      companyId,
      fileName,
      dto.base64Image,
      // optional if your method supports it:
      // mimeType,
    );

    let image: any;

    // ------------------------------------------------------------
    // 4) DB write: upsert variant image OR insert gallery image
    // ------------------------------------------------------------
    if (dto.variantId) {
      // Load existing row (to delete old file if we replace it)
      const existing = await tx.query.productImages.findFirst({
        where: and(
          eq(productImages.companyId, companyId),
          eq(productImages.productId, productId),
          eq(productImages.variantId, dto.variantId),
          isNull(productImages.deletedAt),
        ),
      });

      const [upserted] = await tx
        .insert(productImages)
        .values({
          companyId,
          productId,
          variantId: dto.variantId,
          url,
          altText: dto.altText ?? null,
          position: dto.position ?? 0,

          // ✅ new fields (remove if not in schema)
          fileName,
          mimeType,
          size,
          width,
          height,
        })
        .onConflictDoUpdate({
          target: [
            productImages.companyId,
            productImages.productId,
            productImages.variantId,
          ],
          set: {
            url: sql`excluded.url`,
            altText: sql`excluded.alt_text`,
            position: sql`excluded.position`,

            // ✅ new fields (remove if not in schema)
            fileName: sql`excluded.file_name`,
            mimeType: sql`excluded.mime_type`,
            size: sql`excluded.size`,
            width: sql`excluded.width`,
            height: sql`excluded.height`,
          },
        })
        .returning()
        .execute();

      image = upserted;

      // ✅ delete old s3 object AFTER successful upsert (avoid breaking if upload fails)
      if (existing?.url && existing.url !== url) {
        const oldKey = this.extractStorageKeyFromUrl(existing.url);
        if (oldKey) {
          // best-effort delete; don't block the request if it fails
          try {
            await this.aws.deleteFromS3(oldKey);
          } catch {
            // optionally log
          }
        }
      }
    } else {
      const position = await this.getNextImagePosition(
        companyId,
        productId,
        tx,
      );

      const [inserted] = await tx
        .insert(productImages)
        .values({
          companyId,
          productId,
          url,
          altText: dto.altText ?? null,
          position: dto.position ?? position,
          variantId: null,

          // ✅ new fields (remove if not in schema)
          fileName,
          mimeType,
          size,
          width,
          height,
        })
        .returning()
        .execute();

      image = inserted;
    }

    // ------------------------------------------------------------
    // 5) Update pointers (variant.imageId or product.defaultImageId)
    // ------------------------------------------------------------
    if (dto.variantId) {
      await tx
        .update(productVariants)
        .set({ imageId: image.id, updatedAt: new Date() })
        .where(
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.id, dto.variantId),
          ),
        );
    } else {
      await tx
        .update(products)
        .set({ defaultImageId: image.id, updatedAt: new Date() })
        .where(
          and(
            eq(products.companyId, companyId),
            eq(products.id, productId),
            isNull(products.defaultImageId),
          ),
        );
    }

    // ------------------------------------------------------------
    // 6) Cache + audit (same as you had)
    // ------------------------------------------------------------
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

  async createDefaultProductImage(
    companyId: string,
    productId: string,
    dto: CreateImageDto,
    user?: User,
    ip?: string,
    opts?: CreateImageOptions,
  ) {
    const tx = opts?.tx ?? this.db;

    await this.assertProductBelongsToCompany(companyId, productId);

    // Upload base64 to S3
    const fileName = `${productId}-default-${Date.now()}.jpg`;
    const url = await this.aws.uploadImageToS3(
      companyId,
      fileName,
      dto.base64Image,
    );

    const image = await tx.transaction(async (trx) => {
      // 1) Create product image (no variant)
      const [inserted] = await trx
        .insert(productImages)
        .values({
          companyId,
          productId,
          variantId: null,
          url,
          altText: dto.altText ?? null,
          position: 0, // hero image
        })
        .returning()
        .execute();

      // 2) Force set as product default image
      await trx
        .update(products)
        .set({
          defaultImageId: inserted.id,
          updatedAt: new Date(),
        })
        .where(
          and(eq(products.companyId, companyId), eq(products.id, productId)),
        );

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

  // --------------------- Update Image ---------------------

  async updateImage(
    companyId: string,
    imageId: string,
    dto: UpdateImageDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findImageOrThrow(companyId, imageId);

    if (dto.variantId) {
      await this.assertVariantBelongsToCompany(companyId, dto.variantId);
    }

    let newUrl = existing.url;

    // If a new image is provided, upload and replace URL
    if (dto.base64Image) {
      const fileName = `${existing.productId}-${Date.now()}.jpg`;
      newUrl = await this.aws.uploadImageToS3(
        companyId,
        fileName,
        dto.base64Image,
      );

      // Optionally: delete the old S3 object if you want to clean up
      // (would require you store the key or parse it from existing.url)
    }

    const [updated] = await this.db
      .update(productImages)
      .set({
        url: newUrl,
        altText: dto.altText ?? existing.altText,
        position: dto.position ?? existing.position,
        variantId:
          dto.variantId === undefined ? existing.variantId : dto.variantId,
      })
      .where(
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.id, imageId),
        ),
      )
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

  // --------------------- Delete Image ---------------------

  async deleteImage(
    companyId: string,
    imageId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findImageOrThrow(companyId, imageId);

    const [deleted] = await this.db
      .delete(productImages)
      .where(
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.id, imageId),
        ),
      )
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
}
