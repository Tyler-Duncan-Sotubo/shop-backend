import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AwsService } from 'src/common/aws/aws.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { media, productImages, products } from 'src/drizzle/schema';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
import { and, eq, ilike, isNull, sql } from 'drizzle-orm';
import { CacheService } from 'src/common/cache/cache.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly aws: AwsService,
    private readonly cache: CacheService,
    @Inject(DRIZZLE) private readonly db: db,
  ) {}

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private extractStorageKeyFromUrl(url?: string | null) {
    if (!url) return null;
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\//, ''); // remove leading '/'
    } catch {
      return null;
    }
  }

  private async buildMediaPayload(params: {
    companyId: string;
    storeId: string;
    base64: string;
    fileName: string;
    mimeType: string;
    folder: string;
    tag?: string | null;
    altText?: string | null;
  }) {
    const { companyId, base64, fileName, mimeType } = params;

    // 1) upload
    const url = await this.aws.uploadImageToS3(companyId, fileName, base64);

    // 2) decode for size + (optional) dimensions
    const normalized = base64.includes(',') ? base64.split(',')[1] : base64;
    const buffer = Buffer.from(normalized, 'base64');

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
        // non-fatal
      }
    }

    return {
      companyId: params.companyId,
      storeId: params.storeId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      url,
      storageKey: null, // ✅ update later once aws returns key
      size: buffer.byteLength,
      width,
      height,
      altText: params.altText ?? null,
      folder: params.folder,
      tag: params.tag ?? null,
    };
  }

  // --------------------------------------------------------------------------
  // Uploads
  // --------------------------------------------------------------------------

  async uploadEditorImage(companyId: string, dto: UploadEditorImageDto) {
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

    const [created] = await this.db.insert(media).values(payload).returning();

    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  async uploadMediaFile(companyId: string, dto: CreateMediaDto) {
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

    const [created] = await this.db.insert(media).values(payload).returning();

    await this.cache.bumpCompanyVersion(companyId);

    return {
      url: created.url,
      altText: created.altText,
    };
  }

  // --------------------------------------------------------------------------
  // List (Media + Product images)
  // --------------------------------------------------------------------------

  async getMedia(companyId: string, query: GetMediaQueryDto) {
    const { storeId, search, limit = 20 } = query;

    // 1️⃣ General media
    const generalMedia = await this.db
      .select({
        id: media.id,
        url: media.url,
        fileName: media.fileName,
        mimeType: media.mimeType,
        createdAt: media.createdAt,
        source: sql<'media'>`'media'`,
        size: media.size,
      })
      .from(media)
      .where(
        and(
          eq(media.companyId, companyId),
          eq(media.storeId, storeId),
          isNull(media.deletedAt),
          search ? ilike(media.fileName, `%${search}%`) : undefined,
        ),
      );

    // 2️⃣ Product images (joined via products)
    const images = await this.db
      .select({
        id: productImages.id,
        url: productImages.url,
        createdAt: productImages.createdAt,
        fileName: productImages.fileName,
        mimeType: productImages.mimeType,
        size: productImages.size,
      })
      .from(productImages)
      .innerJoin(products, eq(productImages.productId, products.id))
      .where(
        and(
          eq(productImages.companyId, companyId),
          eq(products.storeId, storeId),
          isNull(productImages.deletedAt),
          search ? ilike(productImages.fileName, `%${search}%`) : undefined,
        ),
      );

    // 3️⃣ Merge + sort + limit
    return [...generalMedia, ...images]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // Delete (DB + S3) for MEDIA table rows
  // --------------------------------------------------------------------------

  async removeMedia(companyId: string, mediaId: string) {
    // 1) load row
    const row = await this.db.query.media.findFirst({
      where: and(
        eq(media.companyId, companyId),
        eq(media.id, mediaId),
        isNull(media.deletedAt),
      ),
    });

    if (!row) throw new NotFoundException('Media file not found');

    // 2) delete from s3
    // Prefer storageKey; fallback to parse from url
    const storageKey =
      row.storageKey ?? this.extractStorageKeyFromUrl(row.url) ?? null;

    if (!storageKey) {
      // You can choose to still soft-delete DB even if key missing.
      // But it's safer to force consistency.
      throw new BadRequestException(
        'Cannot delete file from storage: missing storageKey',
      );
    }

    // delete first so DB doesn’t point to dead file if S3 fails
    await this.aws.deleteFromS3(storageKey);

    // 3) soft delete DB
    const [deleted] = await this.db
      .delete(media)
      .where(and(eq(media.companyId, companyId), eq(media.id, mediaId)))
      .returning();

    if (!deleted) throw new NotFoundException('Media file not found');

    // 4) cache bump
    await this.cache.bumpCompanyVersion(companyId);

    return { success: true, id: deleted.id };
  }

  // --------------------------------------------------------------------------
  // OPTIONAL: Delete product image row (DB + S3)
  // (only if you want files page to remove product images too)
  // --------------------------------------------------------------------------

  async removeProductImage(
    companyId: string,
    storeId: string,
    imageId: string,
  ) {
    // ensure store ownership via products join
    const row = await this.db
      .select({
        id: productImages.id,
        url: productImages.url,
        fileName: productImages.fileName,
        productId: productImages.productId,
        companyId: productImages.companyId,
      })
      .from(productImages)
      .innerJoin(products, eq(productImages.productId, products.id))
      .where(
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.id, imageId),
          eq(products.storeId, storeId),
          isNull(productImages.deletedAt),
        ),
      )
      .then((r) => r[0]);

    if (!row) throw new NotFoundException('Product image not found');

    const storageKey = this.extractStorageKeyFromUrl(row.url);
    if (!storageKey) {
      throw new BadRequestException(
        'Cannot delete file from storage: missing storageKey',
      );
    }

    await this.aws.deleteFromS3(storageKey);

    const [deleted] = await this.db
      .update(productImages)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.id, imageId),
        ),
      )
      .returning();

    if (!deleted) throw new NotFoundException('Product image not found');

    await this.cache.bumpCompanyVersion(companyId);

    return { success: true, id: deleted.id };
  }
}
