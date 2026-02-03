import { Injectable, Inject } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { db } from '../drizzle/types/drizzle';
import { DRIZZLE } from '../drizzle/drizzle.module';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

function guessMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return 'text/csv';
  if (ext === '.xlsx')
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}

@Injectable()
export class AwsService {
  private s3Client = new S3Client({
    region: this.configService.get<string>('AWS_REGION'),
  });

  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  private region() {
    const r = this.configService.get<string>('AWS_REGION');
    if (!r) throw new Error('AWS_REGION not configured');
    return r;
  }

  private bucket() {
    const b = this.configService.get<string>('AWS_BUCKET_NAME');
    if (!b) throw new Error('AWS_BUCKET_NAME not configured');
    return b;
  }

  /**
   * ✅ Region-aware public URL (fixes your eu-west-3 vs s3.amazonaws.com mismatch)
   * - This is the canonical virtual-hosted style URL.
   */
  public publicUrlForKey(key: string) {
    return `https://${this.bucket()}.s3.${this.region()}.amazonaws.com/${key}`;
  }

  /**
   * ✅ If your bucket has Object Ownership = "Bucket owner enforced"
   * ACLs are disabled and MUST NOT be used.
   *
   * Set AWS_S3_PUBLIC_READ=true only if you actually want public objects and your bucket policy allows it.
   * Otherwise keep false and serve via signed URLs / CloudFront later.
   */
  private publicReadEnabled() {
    return true;
  }

  async headObject(key: string) {
    const res = await this.s3Client.send(
      new HeadObjectCommand({
        Bucket: this.bucket(),
        Key: key,
      }),
    );

    return {
      contentType: res.ContentType ?? null,
      contentLength:
        typeof res.ContentLength === 'number' ? res.ContentLength : null,
    };
  }

  /**
   * ✅ Existing base64 upload (kept)
   * - Removes ACL when public-read is not enabled
   */
  async uploadImageToS3(email: string, fileName: string, image: any) {
    const base64Data = Buffer.from(
      image.replace(/^data:image\/\w+;base64,/, ''),
      'base64',
    );

    const contentType = image.startsWith('data:image/png')
      ? 'image/png'
      : 'image/jpeg';

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: `${email}/${fileName}`,
        Body: base64Data,
        ContentEncoding: 'base64',
        ContentType: contentType,
        ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
      }),
    );

    return this.publicUrlForKey(`${email}/${fileName}`);
  }

  /**
   * ✅ Public object upload helper (kept)
   * - Removes ACL when public-read is not enabled
   */
  async uploadPublicObject(params: {
    key: string;
    body: Buffer;
    contentType: string;
  }) {
    const { key, body, contentType } = params;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
      }),
    );

    const url = this.publicUrlForKey(key);
    return { key, url };
  }

  async uploadPublicPdf(params: { key: string; pdfBuffer: Buffer }) {
    return this.uploadPublicObject({
      key: params.key,
      body: params.pdfBuffer,
      contentType: 'application/pdf',
      ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
    });
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async uploadBase64ImagePublic(params: {
    key: string;
    base64DataUrl: string;
  }) {
    const { key, base64DataUrl } = params;

    const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    const contentType = base64DataUrl.startsWith('data:image/png')
      ? 'image/png'
      : base64DataUrl.startsWith('data:image/webp')
        ? 'image/webp'
        : base64DataUrl.startsWith('data:image/svg+xml')
          ? 'image/svg+xml'
          : 'image/jpeg';

    return this.uploadPublicObject({ key, body: buffer, contentType });
  }

  async deleteFromS3(storageKey: string) {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket(),
        Key: storageKey,
      }),
    );

    return { ok: true };
  }

  extractKeyFromUrl(url: string) {
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  /**
   * ✅ NEW: presign PUT for client uploads
   * IMPORTANT:
   * - Do NOT set ACL in the presign if bucket ownership enforces ACLs disabled (common).
   * - Browser will PUT using the returned uploadUrl.
   */
  async createPresignedPutUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
    publicRead?: boolean; // if omitted => uses env AWS_S3_PUBLIC_READ
  }) {
    const {
      key,
      contentType,
      expiresInSeconds = 300,
      publicRead = this.publicReadEnabled(),
    } = params;

    const command = new PutObjectCommand({
      Bucket: this.bucket(),
      Key: key,
      ContentType: contentType,
      ...(publicRead ? { ACL: 'public-read' } : {}),
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      key,
      uploadUrl,
      url: this.publicUrlForKey(key),
    };
  }

  /**
   * ✅ ensure object exists before inserting DB
   */
  async assertObjectExists(key: string) {
    await this.s3Client.send(
      new HeadObjectCommand({
        Bucket: this.bucket(),
        Key: key,
      }),
    );
    return true;
  }

  /**
   * ✅ move object from tmp -> final (copy+delete)
   * - Do NOT set ACL if ACLs are disabled.
   */
  async moveObject(params: { fromKey: string; toKey: string }) {
    const { fromKey, toKey } = params;

    await this.s3Client.send(
      new CopyObjectCommand({
        Bucket: this.bucket(),
        CopySource: `${this.bucket()}/${fromKey}`,
        Key: toKey,
        ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
      }),
    );

    await this.deleteFromS3(fromKey);

    return {
      key: toKey,
      url: this.publicUrlForKey(toKey),
    };
  }

  async getObjectBuffer(
    key: string,
  ): Promise<{ buffer: Buffer; contentType?: string | null }> {
    const res = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucket(),
        Key: key,
      }),
    );

    if (!res.Body) {
      throw new Error('S3 object body is empty');
    }

    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return {
      buffer: Buffer.concat(chunks),
      contentType: res.ContentType ?? null,
    };
  }

  // Report Logic

  async uploadFilePath(
    filePath: string,
    companyId: string,
    root: string, // e.g. 'report'
    folder: string, // e.g. 'products'
  ) {
    const buffer = await promisify(fs.readFile)(filePath);

    const fileName = path.basename(filePath);
    const key = `${root}/${companyId}/${folder}/${fileName}`;

    const mimeType = guessMimeType(filePath);

    return this.uploadBuffer(buffer, key, mimeType);
  }

  async uploadBuffer(buffer: Buffer, key: string, mimeType: string) {
    const bucket = this.configService.get('AWS_BUCKET_NAME');
    const region = this.configService.get('AWS_REGION');

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      }),
    );

    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    return { key, url };
  }
}
