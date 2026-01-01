import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateStoreDto } from './dto/create-store.dto';
import { CompanySettingsService } from '../../company-settings/company-settings.service';
import { AwsService } from 'src/common/aws/aws.service';
import { UpdateStoreDto } from './dto/update-store.dto';
export declare class StoresService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly companySettingsService;
    private readonly aws;
    constructor(db: db, cache: CacheService, auditService: AuditService, companySettingsService: CompanySettingsService, aws: AwsService);
    private findStoreByIdOrThrow;
    private ensureSlugUniqueForCompany;
    createStore(companyId: string, payload: CreateStoreDto, user?: User, ip?: string): Promise<{
        id: string;
        name: string;
        slug: string;
        defaultCurrency: string;
        defaultLocale: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        imageUrl: string | null;
        imageAltText: string | null;
    }>;
    getStoresByCompany(companyId: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        imageAltText: string | null;
        defaultCurrency: string;
        defaultLocale: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    getStoreById(companyId: string, storeId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        defaultCurrency: string;
        defaultLocale: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        imageUrl: string | null;
        imageAltText: string | null;
    }>;
    updateStore(companyId: string, storeId: string, payload: UpdateStoreDto, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        imageAltText: string | null;
        defaultCurrency: string;
        defaultLocale: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteStore(companyId: string, storeId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
    getStoreDomains(companyId: string, storeId: string): Promise<{
        id: string;
        storeId: string;
        domain: string;
        isPrimary: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    updateStoreDomains(companyId: string, storeId: string, domains: Array<{
        domain: string;
        isPrimary?: boolean;
    }>, user?: User, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        storeId: string;
        domain: string;
        isPrimary: boolean;
    }[]>;
    getCompanyStoresSummary(companyId: string): Promise<{
        company: {
            id: string;
            name: string;
            slug: string;
        };
        stores: {
            domains: {
                id: string;
                storeId: string;
                domain: string;
                isPrimary: boolean;
                createdAt: Date;
                updatedAt: Date;
                deletedAt: Date | null;
            }[];
            id: string;
            companyId: string;
            name: string;
            slug: string;
            imageUrl: string | null;
            imageAltText: string | null;
            defaultCurrency: string;
            defaultLocale: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
    }>;
}
