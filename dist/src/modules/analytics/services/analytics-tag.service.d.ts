import { db as DbType } from 'src/drizzle/types/drizzle';
import { CreateAnalyticsTagDto } from '../dto/create-analytics-tag.dto';
export declare class AnalyticsTagService {
    private readonly db;
    constructor(db: DbType);
    createTag(companyId: string, userId: string, dto: CreateAnalyticsTagDto): Promise<{
        id: string;
        name: string;
        storeId: string | null;
        token: string;
        isActive: boolean;
        createdAt: Date;
        snippet: string;
    }>;
    listTags(companyId: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        token: string;
        isActive: boolean;
        createdByUserId: string | null;
        revokedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        meta: unknown;
    }[]>;
    revokeTag(companyId: string, tagId: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        token: string;
        isActive: boolean;
        createdByUserId: string | null;
        revokedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        meta: unknown;
    }>;
    getActiveTagByToken(token: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        token: string;
        isActive: boolean;
        createdByUserId: string | null;
        revokedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        meta: unknown;
    }>;
}
