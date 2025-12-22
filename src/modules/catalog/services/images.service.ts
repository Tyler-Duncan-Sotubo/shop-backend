import { Injectable, Inject, NotFoundException } from '@nestjs/common';
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

    // Upload base64 to S3
    const fileName = `${productId}-${Date.now()}.jpg`;
    const url = await this.aws.uploadImageToS3(
      companyId,
      fileName,
      dto.base64Image,
    );

    let image;

    if (dto.variantId) {
      // ✅ one image per variant: update if exists, else insert
      const [upserted] = await tx
        .insert(productImages)
        .values({
          companyId,
          productId,
          variantId: dto.variantId,
          url,
          altText: dto.altText ?? null,
          // position usually irrelevant for variant image; keep null or 0 if you prefer
          position: dto.position ?? 0,
        })
        .onConflictDoUpdate({
          // must match your unique index columns
          target: [
            productImages.companyId,
            productImages.productId,
            productImages.variantId,
          ],
          set: {
            url: sql`excluded.url`,
            altText: sql`excluded.alt_text`,
            position: sql`excluded.position`,
          },
        })
        .returning()
        .execute();

      image = upserted;
    } else {
      // ✅ product gallery image: allow many, keep ordering
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
        })
        .returning()
        .execute();

      image = inserted;
    }

    // after `image = upserted/inserted;`

    if (dto.variantId) {
      // ✅ make variant point at this image
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
      // ✅ if no default image yet, set the product hero
      // (or set it when position === 0 if you prefer)
      await tx
        .update(products)
        .set({ defaultImageId: image.id, updatedAt: new Date() })
        .where(
          and(
            eq(products.companyId, companyId),
            eq(products.id, productId),
            isNull(products.defaultImageId), // only set if missing
          ),
        );
    }

    if (!opts?.skipCacheBump) {
      await this.cache.bumpCompanyVersion(companyId);
    }

    if (!opts?.skipAudit && user && ip) {
      await this.audit.logAction({
        action: 'create', // you might want 'update' if conflict happened; see note below
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
          altText: dto.altText,
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
