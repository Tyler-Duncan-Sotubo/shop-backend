import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  media,
  productImages,
  products,
} from 'src/infrastructure/drizzle/schema';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
import { and, eq, ilike, isNull, sql } from 'drizzle-orm';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { defaultId } from 'src/infrastructure/drizzle/id';
import pngToIco from 'png-to-ico';

export type PresignFileInput = { fileName: string; mimeType: string };

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
      return u.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  private sanitizeFileName(name: string) {
    return (name || 'upload')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 120);
  }

  // --------------------------------------------------------------------------
  // ✅ NEW: Presign for MEDIA uploads (client -> S3)
  // --------------------------------------------------------------------------

  async presignMediaUploads(params: {
    companyId: string;
    files: PresignFileInput[];
    storeId?: string; // optional if you want per-store folders
    folder?: string; // default "files"
    expiresInSeconds?: number;
    publicRead?: boolean;
  }) {
    const {
      companyId,
      files,
      storeId,
      folder = 'files',
      expiresInSeconds = 300,
      publicRead = true,
    } = params;

    if (!companyId) throw new BadRequestException('companyId is required');
    if (!Array.isArray(files) || !files.length) {
      throw new BadRequestException('files is required');
    }

    const uploads = await Promise.all(
      files.map(async (f) => {
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

        // ✅ media tmp area
        // keep structure consistent with products
        // optionally include storeId for isolation
        const key = storeId
          ? `companies/${companyId}/stores/${storeId}/media/${folder}/tmp/${defaultId()}-${finalName}`
          : `companies/${companyId}/media/${folder}/tmp/${defaultId()}-${finalName}`;

        return this.aws.createPresignedPutUrl({
          key,
          contentType: mimeType,
          expiresInSeconds,
          publicRead,
        });
      }),
    );

    return { uploads };
  }

  // --------------------------------------------------------------------------
  // ✅ NEW: Finalize MEDIA after upload (S3 -> DB)
  // - client sends key + url (+ optional size)
  // - service HEADs S3 to get real size + contentType
  // --------------------------------------------------------------------------

  async finalizeMediaUpload(params: {
    companyId: string;
    storeId: string;
    key: string;
    url?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    folder?: string;
    tag?: string | null;
    altText?: string | null;
  }) {
    const {
      companyId,
      storeId,
      key,
      url,
      fileName,
      mimeType,
      folder = 'files',
      tag = 'file-upload',
      altText = null,
    } = params;

    if (!companyId) throw new BadRequestException('companyId is required');
    if (!storeId) throw new BadRequestException('storeId is required');
    if (!key?.trim()) throw new BadRequestException('key is required');

    // ✅ HEAD to fetch size + contentType reliably
    let head: { contentType?: string | null; contentLength?: number | null };
    try {
      head = await this.aws.headObject(key);
    } catch {
      throw new BadRequestException('Uploaded object not found in storage');
    }

    const finalMimeType =
      (mimeType ?? head.contentType ?? 'application/octet-stream').trim() ||
      'application/octet-stream';

    const finalSize =
      typeof head.contentLength === 'number' ? head.contentLength : null;

    // NOTE: width/height cannot be derived cheaply without downloading
    // keep null for now; if needed later you can queue async metadata extraction
    const payload = {
      id: defaultId(),
      companyId,
      storeId,
      fileName: fileName ?? '',
      mimeType: finalMimeType,
      url: url?.trim() || this.aws.publicUrlForKey(key),
      storageKey: key,
      size: finalSize,
      width: null as any,
      height: null as any,
      altText,
      folder,
      tag,
    };

    const [created] = await this.db.insert(media).values(payload).returning();

    await this.cache.bumpCompanyVersion(companyId);

    return created;
  }

  // --------------------------------------------------------------------------
  // LEGACY: base64 uploads (kept)
  // --------------------------------------------------------------------------

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

    const url = await this.aws.uploadImageToS3(companyId, fileName, base64);

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
      } catch {}
    }

    return {
      id: defaultId(),
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

    return [...generalMedia, ...images]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // --------------------------------------------------------------------------
  // Delete (DB + S3) for MEDIA table rows
  // --------------------------------------------------------------------------

  async removeMedia(companyId: string, mediaId: string) {
    const row = await this.db.query.media.findFirst({
      where: and(
        eq(media.companyId, companyId),
        eq(media.id, mediaId),
        isNull(media.deletedAt),
      ),
    });

    if (!row) throw new NotFoundException('Media file not found');

    const storageKey =
      row.storageKey ?? this.extractStorageKeyFromUrl(row.url) ?? null;

    if (!storageKey) {
      throw new BadRequestException(
        'Cannot delete file from storage: missing storageKey',
      );
    }

    await this.aws.deleteFromS3(storageKey);

    const [deleted] = await this.db
      .delete(media)
      .where(and(eq(media.companyId, companyId), eq(media.id, mediaId)))
      .returning();

    if (!deleted) throw new NotFoundException('Media file not found');

    await this.cache.bumpCompanyVersion(companyId);

    return { success: true, id: deleted.id };
  }

  // --------------------------------------------------------------------------
  // OPTIONAL: Delete product image row (DB + S3)
  // --------------------------------------------------------------------------

  async removeProductImage(
    companyId: string,
    storeId: string,
    imageId: string,
  ) {
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

  // --------------------------------------------------------------------------
  // Existing product presign (kept)
  // --------------------------------------------------------------------------

  async presignProductUploads(params: {
    companyId: string;
    files: PresignFileInput[];
    expiresInSeconds?: number;
    publicRead?: boolean;
  }) {
    const {
      companyId,
      files,
      expiresInSeconds = 300,
      publicRead = true,
    } = params;

    if (!companyId) throw new BadRequestException('companyId is required');
    if (!Array.isArray(files) || !files.length) {
      throw new BadRequestException('files is required');
    }

    const uploads = await Promise.all(
      files.map(async (f) => {
        const mimeType = (f.mimeType || 'image/jpeg').trim() || 'image/jpeg';
        const cleanName = this.sanitizeFileName(f.fileName);

        const extFromMime = mimeType.startsWith('image/')
          ? `.${mimeType.split('/')[1] || 'jpg'}`
          : '.bin';

        const finalName = cleanName.includes('.')
          ? cleanName
          : `${cleanName}${extFromMime}`;

        const key = `companies/${companyId}/products/tmp/${defaultId()}-${finalName}`;

        return this.aws.createPresignedPutUrl({
          key,
          contentType: mimeType,
          expiresInSeconds,
          publicRead,
        });
      }),
    );

    return { uploads };
  }

  async generateFaviconsFromIcon(params: {
    companyId: string;
    storeId: string;
    sourceUrl: string; // uploaded icon URL
    folder?: string; // default "seo/favicons"
  }) {
    const { companyId, storeId, sourceUrl, folder = 'seo/favicons' } = params;

    if (!companyId) throw new BadRequestException('companyId is required');
    if (!storeId) throw new BadRequestException('storeId is required');
    if (!sourceUrl) throw new BadRequestException('sourceUrl is required');

    // 1) derive key from URL (works for your publicUrlForKey style)
    const sourceKey = this.extractStorageKeyFromUrl(sourceUrl);
    if (!sourceKey)
      throw new BadRequestException(
        'Could not extract storage key from sourceUrl',
      );

    // 2) download bytes from S3
    const { buffer: inputBuffer } = await this.aws.getObjectBuffer(sourceKey);

    // 3) sharp generate common sizes
    const sharpMod = await import('sharp');
    const sharpFn: any = (sharpMod as any).default ?? sharpMod;

    // ensure square & transparent padding if needed
    const base = sharpFn(inputBuffer).resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    const png32 = await base.clone().resize(32, 32).png().toBuffer();
    const png16 = await base.clone().resize(16, 16).png().toBuffer();
    const icoBuffer = await pngToIco([png16, png32]);
    const appleTouch = await base.clone().resize(180, 180).png().toBuffer();

    // MVP: skip true .ico, or generate later.
    // If you want .ico: use png-to-ico or sharp-ico here.

    const stamp = Date.now();

    // 4) upload generated files to S3 (server-side)
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

    // 5) insert media rows (so it shows up in media library, consistent with your system)
    const insertRow = async (args: {
      key: string;
      url: string;
      fileName: string;
      tag: string;
    }) => {
      const payload = {
        id: defaultId(),
        companyId,
        storeId,
        fileName: args.fileName,
        mimeType: 'image/png',
        url: args.url,
        storageKey: args.key,
        size: null as any, // optional: set to buffer.byteLength
        width: null as any,
        height: null as any,
        altText: 'Favicon',
        folder,
        tag: args.tag,
      };

      await this.db.insert(media).values(payload);
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

    // 6) Return shape that frontend expects
    return {
      favicon: {
        png: url32, // use 32x32 as main icon reference
        appleTouch: urlApple,
        ico: icoUrl,
        svg: null,
        // optional extras if you want:
        png16: url16,
      },
    };
  }
}
