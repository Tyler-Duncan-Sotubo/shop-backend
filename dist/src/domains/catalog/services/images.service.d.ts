import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateImageDto } from '../dtos/images/create-image.dto';
import { UpdateImageDto } from '../dtos/images/update-image.dto';
import { AwsService } from 'src/infrastructure/aws/aws.service';
type CreateImageOptions = {
    tx?: db;
    skipCacheBump?: boolean;
    skipAudit?: boolean;
};
export declare class ImagesService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly aws;
    constructor(db: db, cache: CacheService, audit: AuditService, aws: AwsService);
    assertProductBelongsToCompany(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    assertVariantBelongsToCompany(companyId: string, variantId: string | null | undefined): Promise<{
        [x: string]: any;
    } | null>;
    findImageOrThrow(companyId: string, imageId: string): Promise<{
        [x: string]: any;
    }>;
    getImages(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }[]>;
    private getNextImagePosition;
    private extractStorageKeyFromUrl;
    private sanitizeFileName;
    createImage(companyId: string, productId: string, dto: CreateImageDto, user?: User, ip?: string, opts?: CreateImageOptions): Promise<any>;
    createDefaultProductImage(companyId: string, productId: string, dto: CreateImageDto, user?: User, ip?: string, opts?: CreateImageOptions): Promise<any>;
    updateImage(companyId: string, imageId: string, dto: UpdateImageDto, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    deleteImage(companyId: string, imageId: string, user?: User, ip?: string): Promise<any>;
}
export {};
