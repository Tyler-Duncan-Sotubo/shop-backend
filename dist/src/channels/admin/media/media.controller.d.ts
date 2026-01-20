import { User } from 'src/channels/admin/common/types/user.type';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
import { PresignProductUploadsDto } from './dto/uploads-signed.dto';
import { FinalizeMediaUploadDto } from './dto/finalize-media.dto';
import { PresignMediaUploadsDto } from './dto/presign-media.dto';
import { GenerateFaviconsDto } from './dto/generate-favicons.dto';
import { MediaService } from 'src/domains/media/media.service';
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
        width: number | null;
        height: number | null;
        fileName: string;
        mimeType: string;
        url: string;
        altText: string | null;
        storageKey: string | null;
        folder: string | null;
        tag: string | null;
    }>;
    uploadMediaFile(user: User, dto: CreateMediaDto): Promise<{
        url: string;
        altText: string | null;
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
    presignProductUploads(user: User, dto: PresignProductUploadsDto): Promise<{
        uploads: {
            key: string;
            uploadUrl: string;
            url: string;
        }[];
    }>;
    presignMediaUploads(user: User, dto: PresignMediaUploadsDto): Promise<{
        uploads: {
            key: string;
            uploadUrl: string;
            url: string;
        }[];
    }>;
    finalizeMediaUpload(user: User, dto: FinalizeMediaUploadDto): Promise<{
        id: string;
        createdAt: Date;
        deletedAt: Date | null;
        companyId: string;
        storeId: string;
        size: number | null;
        width: number | null;
        height: number | null;
        fileName: string;
        mimeType: string;
        url: string;
        altText: string | null;
        storageKey: string | null;
        folder: string | null;
        tag: string | null;
    }>;
    generateFavicons(user: User, dto: GenerateFaviconsDto): Promise<{
        favicon: {
            png: string;
            appleTouch: string;
            ico: string;
            svg: null;
            png16: string;
        };
    }>;
}
