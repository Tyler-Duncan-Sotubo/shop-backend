import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateCategoryDto, UpdateCategoryDto, AssignCategoriesDto } from '../dtos/categories';
export declare class CategoriesService {
    private readonly db;
    private readonly cache;
    private readonly audit;
    constructor(db: db, cache: CacheService, audit: AuditService);
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
    getCategories(companyId: string, storeId?: string | null): Promise<{
        [x: string]: any;
    }[]>;
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
        createdAt: Date;
    }[]>;
    assignCategoriesToProduct(companyId: string, productId: string, dto: AssignCategoriesDto, user?: User, ip?: string): Promise<{
        createdAt: Date;
        companyId: string;
        productId: string;
        categoryId: string;
    }[]>;
}
