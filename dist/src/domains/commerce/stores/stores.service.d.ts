import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateStoreDto } from './dto/create-store.dto';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { UpdateStoreDto } from './dto/update-store.dto';
export declare class StoresService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly aws;
    constructor(db: db, cache: CacheService, auditService: AuditService, aws: AwsService);
    private findStoreByIdOrThrow;
    private ensureSlugUniqueForCompany;
    createStore(companyId: string, payload: CreateStoreDto, user?: User, ip?: string): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        defaultCurrency: string;
        defaultLocale: string;
        isActive: boolean;
        deletedAt: Date | null;
        companyId: string;
        imageUrl: string | null;
        imageAltText: string | null;
        supportedCurrencies: string[] | null;
    }>;
    getStoresByCompany(companyId: string): Promise<{
        primaryDomain: string | null;
        domains: string[];
        id: string;
        companyId: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        imageAltText: string | null;
        defaultCurrency: string;
        defaultLocale: string;
        supportedCurrencies: string[] | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    getStoreById(companyId: string, storeId: string): Promise<{
        name: string;
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        defaultCurrency: string;
        defaultLocale: string;
        isActive: boolean;
        deletedAt: Date | null;
        companyId: string;
        imageUrl: string | null;
        imageAltText: string | null;
        supportedCurrencies: string[] | null;
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
        supportedCurrencies: string[] | null;
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
        storeId: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
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
            supportedCurrencies: string[] | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
    }>;
    normalizeHost(hostRaw: string): string;
    resolveStoreByHost(hostRaw: string): Promise<{
        storeId: string;
        domain: string;
        isPrimary: boolean;
        companyId: string;
    } | null>;
}
