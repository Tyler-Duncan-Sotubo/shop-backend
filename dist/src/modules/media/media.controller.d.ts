import { User } from 'src/common/types/user.type';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    uploadEditorImage(user: User, dto: UploadEditorImageDto): Promise<{
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
    uploadMediaFile(user: User, dto: CreateMediaDto): Promise<{
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
    getMedia(user: User, query: GetMediaQueryDto): Promise<{
        id: any;
        url: any;
        createdAt: any;
        fileName: any;
        mimeType: any;
        size: any;
    }[]>;
    deleteMedia(user: User, mediaId: string): Promise<{
        success: boolean;
        id: string;
    }>;
}
