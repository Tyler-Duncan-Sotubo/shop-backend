import { User } from 'src/common/types/user.type';
import { AnalyticsTagService } from '../services/analytics-tag.service';
import { CreateAnalyticsTagDto } from '../dto/create-analytics-tag.dto';
export declare class AnalyticsTagController {
    private readonly tags;
    constructor(tags: AnalyticsTagService);
    list(user: User): Promise<{
        data: {
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
        }[];
    }>;
    create(user: User, dto: CreateAnalyticsTagDto): Promise<{
        data: {
            id: string;
            name: string;
            storeId: string | null;
            token: string;
            isActive: boolean;
            createdAt: Date;
            snippet: string;
        };
    }>;
    revoke(user: User, tagId: string): Promise<{
        data: {
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
        };
    }>;
}
