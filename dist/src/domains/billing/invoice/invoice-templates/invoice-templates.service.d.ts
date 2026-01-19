import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { UpdateInvoiceLogoInput } from '../inputs/update-invoice-logo.input';
export declare class InvoiceTemplatesService {
    private readonly db;
    private readonly auditService;
    private readonly cache;
    private readonly aws;
    constructor(db: db, auditService: AuditService, cache: CacheService, aws: AwsService);
    private tags;
    seedSystemInvoiceTemplates(user: User, ip?: string): Promise<{
        inserted: number;
        updated: number;
    }>;
    listSystemTemplates(): Promise<{
        id: string;
        key: string;
        version: string;
        name: string;
        engine: string;
        content: string;
        css: string | null;
        isActive: boolean;
        isDeprecated: boolean;
        isDefault: boolean;
        meta: unknown;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getSystemTemplateById(templateId: string): Promise<{
        id: string;
        key: string;
        version: string;
        name: string;
        engine: string;
        content: string;
        css: string | null;
        isActive: boolean;
        isDeprecated: boolean;
        isDefault: boolean;
        meta: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getDefaultSystemTemplate(): Promise<{
        id: string;
        key: string;
        version: string;
        name: string;
        engine: string;
        content: string;
        css: string | null;
        isActive: boolean;
        isDeprecated: boolean;
        isDefault: boolean;
        meta: unknown;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getBranding(companyId: string, storeId?: string | null): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        templateId: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
        supplierName: string | null;
        supplierAddress: string | null;
        supplierEmail: string | null;
        supplierPhone: string | null;
        supplierTaxId: string | null;
        bankDetails: unknown;
        footerNote: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    upsertCompanyBranding(user: User, dto: any, ip?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        templateId: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
        supplierName: string | null;
        supplierAddress: string | null;
        supplierEmail: string | null;
        supplierPhone: string | null;
        supplierTaxId: string | null;
        bankDetails: unknown;
        footerNote: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    previewForCompany(companyId: string, opts?: {
        storeId?: string | null;
        templateId?: string;
    }): Promise<{
        html: string;
        template: {
            id: any;
            key: any;
            version: any;
            name: any;
        };
        brandingUsed: {
            id: string;
            companyId: string;
            storeId: string | null;
            templateId: string | null;
            logoUrl: string | null;
            primaryColor: string | null;
            supplierName: string | null;
            supplierAddress: string | null;
            supplierEmail: string | null;
            supplierPhone: string | null;
            supplierTaxId: string | null;
            bankDetails: unknown;
            footerNote: string | null;
            createdAt: Date;
            updatedAt: Date;
        } | null;
        usingDefaultTemplate: boolean;
    }>;
    private getSampleInvoiceViewModel;
    private normalizeBranding;
    uploadBrandingLogo(user: User, dto: UpdateInvoiceLogoInput, ip?: string): Promise<{
        logoUrl: string;
        storeId: string | null;
        branding: any;
    }>;
}
