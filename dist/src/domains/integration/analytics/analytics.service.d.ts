import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import type { User } from 'src/channels/admin/common/types/user.type';
export declare class AnalyticsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    upsertForCompany(companyId: string, storeId: string, dto: CreateAnalyticsDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        enabled: boolean;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        requiresConsent: boolean;
    }>;
    findAllForStore(companyId: string, storeId: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        enabled: boolean;
        requiresConsent: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findByProvider(companyId: string, storeId: string, provider: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        enabled: boolean;
        requiresConsent: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateByProvider(companyId: string, storeId: string, provider: string, dto: UpdateAnalyticsDto, user: User, ip: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        enabled: boolean;
        requiresConsent: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setEnabled(companyId: string, storeId: string, provider: string, enabled: boolean, user: User, ip: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        enabled: boolean;
        requiresConsent: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(companyId: string, storeId: string, provider: string, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        enabled: boolean;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        requiresConsent: boolean;
    }>;
    getPublicForStore(companyId: string, storeId: string): Promise<{
        provider: string;
        publicConfig: unknown;
        requiresConsent: boolean;
    }[]>;
}
