import { AwsService } from 'src/common/aws/aws.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { db } from 'src/drizzle/types/drizzle';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
import { CacheService } from 'src/common/cache/cache.service';
export declare class MediaService {
    private readonly aws;
    private readonly cache;
    private readonly db;
    constructor(aws: AwsService, cache: CacheService, db: db);
    private extractStorageKeyFromUrl;
    private buildMediaPayload;
    uploadEditorImage(companyId: string, dto: UploadEditorImageDto): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        size: number | null;
        fileName: string;
        mimeType: string;
        url: string;
        storageKey: string | null;
        width: number | null;
        height: number | null;
        altText: string | null;
        folder: string | null;
        tag: string | null;
    }>;
    uploadMediaFile(companyId: string, dto: CreateMediaDto): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        size: number | null;
        fileName: string;
        mimeType: string;
        url: string;
        storageKey: string | null;
        width: number | null;
        height: number | null;
        altText: string | null;
        folder: string | null;
        tag: string | null;
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
}
