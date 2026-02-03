import { ConfigService } from '@nestjs/config';
import { db } from '../drizzle/types/drizzle';
export declare class AwsService {
    private configService;
    private db;
    private s3Client;
    constructor(configService: ConfigService, db: db);
    private region;
    private bucket;
    publicUrlForKey(key: string): string;
    private publicReadEnabled;
    headObject(key: string): Promise<{
        contentType: string | null;
        contentLength: number | null;
    }>;
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
    createPresignedPutUrl(params: {
        key: string;
        contentType: string;
        expiresInSeconds?: number;
        publicRead?: boolean;
    }): Promise<{
        key: string;
        uploadUrl: string;
        url: string;
    }>;
    assertObjectExists(key: string): Promise<boolean>;
    moveObject(params: {
        fromKey: string;
        toKey: string;
    }): Promise<{
        key: string;
        url: string;
    }>;
    getObjectBuffer(key: string): Promise<{
        buffer: Buffer;
        contentType?: string | null;
    }>;
    uploadFilePath(filePath: string, companyId: string, root: string, folder: string): Promise<{
        key: string;
        url: string;
    }>;
    uploadBuffer(buffer: Buffer, key: string, mimeType: string): Promise<{
        key: string;
        url: string;
    }>;
}
