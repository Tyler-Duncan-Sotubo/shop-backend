import { Injectable, Inject } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';

@Injectable()
export class AwsService {
  private s3Client = new S3Client({
    region: this.configService.get('AWS_REGION'),
  });

  constructor(
    private configService: ConfigService,
    @Inject(DRIZZLE) private db: db,
  ) {}

  private bucket() {
    const b = this.configService.get<string>('AWS_BUCKET_NAME');
    if (!b) throw new Error('AWS_BUCKET_NAME not configured');
    return b;
  }

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
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: `${email}/${fileName}`,
        Body: base64Data,
        ContentEncoding: 'base64',
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );

    return `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${email}/${fileName}`; //
  }

  /**
   * Public-read upload: simplest for PDFs/branding assets that must load in Playwright.
   * Deterministic key => overwrites old.
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
        ACL: 'public-read',
      }),
    );

    // Public S3 URL (works if bucket policy allows public reads; with ACL public-read it usually does)
    const url = `https://${this.bucket()}.s3.amazonaws.com/${key}`;
    return { key, url };
  }

  async uploadPublicPdf(params: { key: string; pdfBuffer: Buffer }) {
    return this.uploadPublicObject({
      key: params.key,
      body: params.pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  /**
   * If later you move to private bucket, use signed urls.
   * (Front-end can use returned signed URL for download/open.)
   */
  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket(),
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  /**
   * If your frontend currently sends base64 strings, keep this helper.
   * But for PDFs, prefer uploadPublicPdf.
   */
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
    const Bucket = this.configService.get('AWS_BUCKET_NAME');
    if (!Bucket) throw new Error('AWS_S3_BUCKET is not set');

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket,
        Key: storageKey,
      }),
    );

    return { ok: true };
  }

  /**
   * Optional helper if you only have a full URL.
   * Works if your URL contains the key after the bucket domain.
   */
  extractKeyFromUrl(url: string) {
    try {
      const u = new URL(url);
      // Example: /companyId/path/file.jpg -> "companyId/path/file.jpg"
      return u.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }
}
