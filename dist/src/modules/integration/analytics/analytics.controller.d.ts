import type { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import { SetAnalyticsEnabledDto } from './dto/set-enabled.dto';
export declare class AnalyticsController extends BaseController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    listAdmin(user: User, storeId: string): Promise<{
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
    getAdmin(user: User, provider: string, storeId: string): Promise<{
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
    upsertAdmin(user: User, storeId: string, dto: CreateAnalyticsDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        enabled: boolean;
        requiresConsent: boolean;
    }>;
    updateAdmin(user: User, storeId: string, provider: string, dto: UpdateAnalyticsDto, ip: string): Promise<{
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
    setEnabledAdmin(user: User, storeId: string, provider: string, dto: SetAnalyticsEnabledDto, ip: string): Promise<{
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
    removeAdmin(user: User, storeId: string, provider: string, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        provider: string;
        publicConfig: unknown;
        privateConfig: unknown;
        enabled: boolean;
        requiresConsent: boolean;
    }>;
    getStorefront(companyId: string, storeId: string): Promise<{
        provider: string;
        publicConfig: unknown;
        requiresConsent: boolean;
    }[]>;
}
