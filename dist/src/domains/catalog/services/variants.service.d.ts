import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { AuditService } from "../../audit/audit.service";
import { User } from "../../../channels/admin/common/types/user.type";
import { CreateVariantDto, UpdateVariantDto, VariantQueryDto } from '../dtos/variants';
import { ImagesService } from './images.service';
import { InventoryStockService } from "../../commerce/inventory/services/inventory-stock.service";
import { StoreVariantQueryDto } from '../dtos/variants/store-vairants.dto';
import { CategoriesService } from './categories.service';
import { CompanySettingsService } from "../../company-settings/company-settings.service";
import { BarcodeService } from './barcode.service';
import { POSVariant, POSVariantQuery } from '../input/pos-variant.type';
export declare class VariantsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    private readonly imagesService;
    private readonly inventoryService;
    private readonly categoriesService;
    private readonly companySettings;
    private readonly barcodeService;
    constructor(db: db, cache: CacheService, auditService: AuditService, imagesService: ImagesService, inventoryService: InventoryStockService, categoriesService: CategoriesService, companySettings: CompanySettingsService, barcodeService: BarcodeService);
    private generateVariantSku;
    assertCompanyExists(companyId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
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
        inventory: any;
    } | {
        variant: any;
        image: {
            id: any;
            url: any;
            altText: any;
            position: any;
        };
        inventory: any;
    } | {
        variant: any;
        image: {
            id: any;
            url: any;
            altText: any;
            position: any;
        } | null;
        inventory: any;
    } | {
        variant: any;
        image: never;
        inventory: any;
    })[]>;
    listStoreVariantsForCombobox(companyId: string, query: StoreVariantQueryDto): Promise<{
        id: any;
        title: any;
        sku: any;
        productName: any;
        imageUrl: any;
        suggestedUnitPrice: any;
        available: number;
        label: string;
    }[]>;
    listVariantsForPOS(companyId: string, query: POSVariantQuery): Promise<POSVariant[]>;
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
