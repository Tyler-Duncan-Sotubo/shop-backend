import { db } from 'src/drizzle/types/drizzle';
import { ProductLinkType } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
export declare class LinkedProductsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
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
    assertProductsBelongToCompany(companyId: string, productIds: string[]): Promise<void>;
    getLinkedProducts(companyId: string, productId: string, linkType?: ProductLinkType): Promise<{
        id: string;
        companyId: string;
        productId: string;
        linkedProductId: string;
        linkType: "related" | "upsell" | "cross_sell" | "accessory";
        position: number;
        createdAt: Date;
    }[]>;
    setLinkedProducts(companyId: string, productId: string, linkType: ProductLinkType, linkedProductIds: string[], user?: User, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        productId: string;
        position: number;
        linkedProductId: string;
        linkType: "related" | "upsell" | "cross_sell" | "accessory";
    }[]>;
    removeLink(companyId: string, productId: string, linkId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
}
