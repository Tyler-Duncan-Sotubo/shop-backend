import { User } from "../../common/types/user.type";
import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateStoreDomainsDto } from './dto/update-store-domains.dto';
import { StoresService } from "../../../../domains/commerce/stores/stores.service";
import { UserStoreAccessService } from "../../../../domains/auth/services/user-store-access.service";
export declare class StoresController extends BaseController {
    private readonly storesService;
    private readonly userStoreAccess;
    constructor(storesService: StoresService, userStoreAccess: UserStoreAccessService);
    getCompanyStoresSummary(user: User): Promise<{
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
            storeEmail: string | null;
            defaultCurrency: string;
            defaultLocale: string;
            supportedCurrencies: string[] | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        }[];
    }>;
    getAccessibleStores(user: User): Promise<{
        id: string;
        name: string;
        imageUrl: string | null;
    }[]>;
    getUserStores(userId: string): Promise<{
        id: string;
        name: string;
        imageUrl: string | null;
    }[]>;
    getStores(user: User): Promise<{
        primaryDomain: string | null;
        domains: string[];
        id: string;
        companyId: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        imageAltText: string | null;
        storeEmail: string | null;
        defaultCurrency: string;
        defaultLocale: string;
        supportedCurrencies: string[] | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    createStore(user: User, dto: CreateStoreDto, ip: string): Promise<{
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
        storeEmail: string | null;
        supportedCurrencies: string[] | null;
    }>;
    getStoreById(user: User, storeId: string): Promise<{
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
        storeEmail: string | null;
        supportedCurrencies: string[] | null;
    }>;
    updateStore(user: User, storeId: string, dto: UpdateStoreDto, ip: string): Promise<{
        id: string;
        companyId: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        imageAltText: string | null;
        storeEmail: string | null;
        defaultCurrency: string;
        defaultLocale: string;
        supportedCurrencies: string[] | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteStore(user: User, storeId: string, ip: string): Promise<{
        success: boolean;
    }>;
    getStoreDomains(user: User, storeId: string): Promise<{
        id: string;
        storeId: string;
        domain: string;
        isPrimary: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }[]>;
    updateStoreDomains(user: User, storeId: string, dto: UpdateStoreDomainsDto, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        storeId: string;
        domain: string;
        isPrimary: boolean;
    }[]>;
}
