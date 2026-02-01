import { AwsService } from 'src/infrastructure/aws/aws.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
import { CacheService } from 'src/infrastructure/cache/cache.service';
export type PresignFileInput = {
    fileName: string;
    mimeType: string;
};
export declare class MediaService {
    private readonly aws;
    private readonly cache;
    private readonly db;
    constructor(aws: AwsService, cache: CacheService, db: db);
    private extractStorageKeyFromUrl;
    private sanitizeFileName;
    presignMediaUploads(params: {
        companyId: string;
        files: PresignFileInput[];
        storeId?: string;
        folder?: string;
        expiresInSeconds?: number;
        publicRead?: boolean;
    }): Promise<{
        uploads: {
            key: string;
            uploadUrl: string;
            url: string;
        }[];
    }>;
    finalizeMediaUpload(params: {
        companyId: string;
        storeId: string;
        key: string;
        url?: string | null;
        fileName?: string | null;
        mimeType?: string | null;
        folder?: string;
        tag?: string | null;
        altText?: string | null;
    }): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        companyId: string;
        size: number | null;
        storeId: string;
        fileName: string;
        mimeType: string;
        storageKey: string | null;
        width: number | null;
        height: number | null;
        altText: string | null;
        folder: string | null;
        tag: string | null;
    }>;
    private buildMediaPayload;
    uploadEditorImage(companyId: string, dto: UploadEditorImageDto): Promise<{
        url: string;
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        companyId: string;
        size: number | null;
        storeId: string;
        fileName: string;
        mimeType: string;
        storageKey: string | null;
        width: number | null;
        height: number | null;
        altText: string | null;
        folder: string | null;
        tag: string | null;
    }>;
    uploadMediaFile(companyId: string, dto: CreateMediaDto): Promise<{
        url: string;
        altText: string | null;
    }>;
    getMedia(companyId: string, query: GetMediaQueryDto): Promise<{
        id: any;
        url: any;
        createdAt: any;
        fileName: any;
        mimeType: any;
        size: any;
    }[]>;
    removeMedia(companyId: string, mediaId: string): Promise<{
        success: boolean;
        id: string;
    }>;
    removeProductImage(companyId: string, storeId: string, imageId: string): Promise<{
        success: boolean;
        id: any;
    }>;
    presignProductUploads(params: {
        companyId: string;
        files: PresignFileInput[];
        expiresInSeconds?: number;
        publicRead?: boolean;
    }): Promise<{
        uploads: {
            key: string;
            uploadUrl: string;
            url: string;
        }[];
    }>;
    generateFaviconsFromIcon(params: {
        companyId: string;
        storeId: string;
        sourceUrl: string;
        folder?: string;
    }): Promise<{
        favicon: {
            png: string;
            appleTouch: string;
            ico: string;
            svg: null;
            png16: string;
        };
    }>;
}
