import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateVariantDto, UpdateVariantDto, VariantQueryDto } from '../dtos/variants';
import { ImagesService } from './images.service';
import { InventoryStockService } from 'src/modules/commerce/inventory/services/inventory-stock.service';
import { StoreVariantQueryDto } from '../dtos/variants/store-vairants.dto';
import { CategoriesService } from './categories.service';
export declare class VariantsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly imagesService;
    private readonly inventoryService;
    private readonly categoriesService;
    constructor(db: db, cache: CacheService, auditService: AuditService, imagesService: ImagesService, inventoryService: InventoryStockService, categoriesService: CategoriesService);
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
    findVariantByIdOrThrow(companyId: string, variantId: string): Promise<{
        [x: string]: any;
    }>;
    ensureSkuUnique(companyId: string, sku: string | undefined, excludeVariantId?: string): Promise<void>;
    createVariant(companyId: string, productId: string, dto: CreateVariantDto, user?: User, ip?: string): Promise<any>;
    listVariants(companyId: string, query: VariantQueryDto): Promise<({
        variant: any;
        image: {
            id: any;
            url: any;
            altText: any;
            position: any;
        };
        inventory: {
            stockQuantity: number;
            lowStockThreshold: number;
        };
    } | {
        variant: any;
        image: {
            id: any;
            url: any;
            altText: any;
            position: any;
        };
        inventory: {
            stockQuantity: number;
            lowStockThreshold: number;
        };
    } | {
        variant: any;
        image: {
            id: any;
            url: any;
            altText: any;
            position: any;
        } | null;
        inventory: {
            stockQuantity: number;
            lowStockThreshold: number;
        } | null;
    } | {
        variant: any;
        image: never;
        inventory: never;
    })[]>;
    listStoreVariantsForCombobox(companyId: string, query: StoreVariantQueryDto): Promise<{
        id: any;
        title: any;
        sku: any;
        productName: any;
        imageUrl: any;
        suggestedUnitPrice: number | null;
        available: number;
        label: string;
    }[]>;
    getVariantById(companyId: string, variantId: string): Promise<{
        [x: string]: any;
    }>;
    updateVariant(companyId: string, variantId: string, dto: UpdateVariantDto, user?: User, ip?: string): Promise<{
        [x: string]: any;
    }>;
    deleteVariant(companyId: string, variantId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
    generateVariantsForProduct(companyId: string, productId: string, user?: User, ip?: string): Promise<any>;
}
