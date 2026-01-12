import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateCategoryDto, UpdateCategoryDto, AssignCategoriesDto } from '../dtos/categories';
import { AwsService } from 'src/common/aws/aws.service';
export declare class CategoriesService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    private readonly aws;
    constructor(db: db, cache: CacheService, audit: AuditService, aws: AwsService);
    assertCompanyExists(companyId: string): Promise<{
        id: string;
        name: string;
        slug: string;
        legalName: string | null;
        country: string | null;
        vatNumber: string | null;
        defaultCurrency: string;
        timezone: string;
        defaultLocale: string;
        billingEmail: string | null;
        billingCustomerId: string | null;
        billingProvider: string | null;
        plan: string;
        companySize: string | null;
        industry: string | null;
        useCase: string | null;
        trialEndsAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    assertProductBelongsToCompany(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    findCategoryByIdOrThrow(companyId: string, categoryId: string): Promise<{
        [x: string]: any;
    }>;
    assertCategoriesBelongToCompany(companyId: string, categoryIds: string[]): Promise<void>;
    assertParentValid(companyId: string, parentId?: string | null, categoryIdBeingUpdated?: string): Promise<void>;
    private sanitizeFileName;
    private extractStorageKeyFromUrl;
    private createMediaFromBase64OrThrow;
    private assertMediaBelongsToCompanyAndStore;
    listCategoriesAdmin(companyId: string, storeId: string): Promise<({
        productCount: number;
        id: any;
        name: any;
        slug: any;
        parentId: any;
        position: any;
        isActive: any;
        imageUrl: string | null;
    } | {
        productCount: number;
        id: any;
        name: any;
        slug: any;
        parentId: any;
        position: any;
        isActive: any;
        imageUrl: string | null;
    })[]>;
    getCategoryAdmin(companyId: string, storeId: string, categoryId: string): Promise<{
        id: any;
        name: any;
        slug: any;
        parentId: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    } | {
        id: any;
        name: any;
        slug: any;
        parentId: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    }>;
    listCategoryProductsAdmin(companyId: string, storeId: string, categoryId: string, opts?: {
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<({
        id: any;
        name: any;
        status: any;
        imageUrl: any;
        pinned: any;
        position: any;
    } | {
        id: any;
        name: any;
        status: any;
        imageUrl: any;
        pinned: any;
        position: any;
    } | {
        id: any;
        name: any;
        status: any;
        imageUrl: any;
        pinned: any;
        position: any;
    } | {
        id: any;
        name: any;
        status: any;
        imageUrl: any;
        pinned: any;
        position: any;
    })[]>;
    getCategoryAdminWithProducts(companyId: string, storeId: string, categoryId: string, opts?: {
        limit?: number;
        offset?: number;
        search?: string;
    }): Promise<{
        category: {
            id: any;
            name: any;
            slug: any;
            parentId: any;
            description: any;
            afterContentHtml: any;
            metaTitle: any;
            metaDescription: any;
            position: any;
            isActive: any;
            createdAt: any;
            updatedAt: any;
            imageMediaId: any;
            imageUrl: string | null;
            imageAltText: string | null;
        } | {
            id: any;
            name: any;
            slug: any;
            parentId: any;
            description: any;
            afterContentHtml: any;
            metaTitle: any;
            metaDescription: any;
            position: any;
            isActive: any;
            createdAt: any;
            updatedAt: any;
            imageMediaId: any;
            imageUrl: string | null;
            imageAltText: string | null;
        };
        products: ({
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        } | {
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        } | {
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        } | {
            id: any;
            name: any;
            status: any;
            imageUrl: any;
            pinned: any;
            position: any;
        })[];
        total: number;
        limit: number;
        offset: number;
    }>;
    reorderCategoryProducts(companyId: string, categoryId: string, items: {
        productId: string;
        position: number;
        pinned?: boolean;
    }[]): Promise<{
        success: boolean;
    }>;
    getCategories(companyId: string, storeId?: string | null): Promise<({
        id: any;
        companyId: any;
        storeId: any;
        parentId: any;
        name: any;
        slug: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    } | {
        id: any;
        companyId: any;
        storeId: any;
        parentId: any;
        name: any;
        slug: any;
        description: any;
        afterContentHtml: any;
        metaTitle: any;
        metaDescription: any;
        position: any;
        isActive: any;
        createdAt: any;
        updatedAt: any;
        imageMediaId: any;
        imageUrl: string | null;
        imageAltText: string | null;
    })[]>;
    getCategoriesWithLimit(companyId: string, storeId?: string | null, limit?: number): Promise<({
        id: any;
        name: any;
        slug: any;
        imageUrl: string | null;
        imageAltText: string | null;
    } | {
        id: any;
        name: any;
        slug: any;
        imageUrl: string | null;
        imageAltText: string | null;
    })[]>;
    createCategory(companyId: string, dto: CreateCategoryDto, user?: User, ip?: string): Promise<any>;
    updateCategory(companyId: string, categoryId: string, dto: UpdateCategoryDto, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    deleteCategory(companyId: string, categoryId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
    getProductCategories(companyId: string, productId: string): Promise<{
        productId: string;
        categoryId: string;
        companyId: string;
        position: number;
        pinned: boolean;
        createdAt: Date;
    }[]>;
    assignCategoriesToProduct(companyId: string, productId: string, dto: AssignCategoriesDto, user?: User, ip?: string): Promise<{
        createdAt: Date;
        companyId: string;
        productId: string;
        position: number;
        categoryId: string;
        pinned: boolean;
    }[]>;
    syncSalesCategoryForProduct(params: {
        companyId: string;
        productId: string;
        storeId?: string;
        salesSlug?: string;
        salesName?: string;
    }): Promise<{
        salesCategoryId: any;
        shouldBeOnSale: boolean;
        changed: boolean;
    }>;
}
