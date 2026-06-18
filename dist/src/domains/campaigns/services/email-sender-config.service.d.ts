import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { UpsertEmailSenderConfigDto } from '../inputs/email-sender.type';
export declare class EmailSenderConfigService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private cacheKey;
    private bumpCompany;
    getConfig(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        fromEmail: string;
        fromName: string;
        logoUrl: string | null;
        brandColor: string | null;
        companyAddress: string | null;
        socialLinks: string | null;
        footerTagline: string | null;
    }>;
    getConfigOrThrow(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        fromEmail: string;
        fromName: string;
        logoUrl: string | null;
        brandColor: string | null;
        companyAddress: string | null;
        socialLinks: string | null;
        footerTagline: string | null;
    }>;
    upsertConfig(companyId: string, dto: UpsertEmailSenderConfigDto): Promise<any>;
}
