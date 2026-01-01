import { ConfigService } from '@nestjs/config';
import { db } from '../../drizzle/types/drizzle';
export declare class AwsService {
    private configService;
    private db;
    private s3Client;
    constructor(configService: ConfigService, db: db);
    private bucket;
    uploadImageToS3(email: string, fileName: string, image: any): Promise<string>;
    uploadPublicObject(params: {
        key: string;
        body: Buffer;
        contentType: string;
    }): Promise<{
        key: string;
        url: string;
    }>;
    uploadPublicPdf(params: {
        key: string;
        pdfBuffer: Buffer;
    }): Promise<{
        key: string;
        url: string;
    }>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    uploadBase64ImagePublic(params: {
        key: string;
        base64DataUrl: string;
    }): Promise<{
        key: string;
        url: string;
    }>;
    deleteFromS3(storageKey: string): Promise<{
        ok: boolean;
    }>;
    extractKeyFromUrl(url: string): string | null;
}
