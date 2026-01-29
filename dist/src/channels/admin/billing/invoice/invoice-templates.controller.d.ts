import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { UpdateInvoiceBrandingDto } from './dto/invoice-templates-dto/update-invoice-branding.dto';
import { UpdateInvoiceLogoDto } from './dto/invoice-templates-dto/update-invoice-logo.dto';
import { InvoiceTemplatesService } from 'src/domains/billing/invoice/invoice-templates/invoice-templates.service';
import { InvoicePdfService } from 'src/domains/billing/invoice/invoice-templates/invoice-pdf.service';
export declare class AdminInvoiceTemplatesController extends BaseController {
    private readonly invoiceTemplatesService;
    private readonly invoicePdfService;
    constructor(invoiceTemplatesService: InvoiceTemplatesService, invoicePdfService: InvoicePdfService);
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
    seedSystemInvoiceTemplates(user: User, ip: string): Promise<{
        inserted: number;
        updated: number;
    }>;
    getInvoiceBranding(user: User, storeId?: string): Promise<{
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
    upsertInvoiceBranding(user: User, dto: UpdateInvoiceBrandingDto, ip: string): Promise<{
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
    previewHtml(user: User, templateId?: string, storeId?: string): Promise<{
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
    previewPdf(user: User, storeId: string, templateId?: string): Promise<{
        pdfUrl: string;
        storageKey: string;
        template: {
            id: string;
            key: string;
            version: string;
            name: string;
        };
        storeId: string | null;
    }>;
    generateForInvoice(user: User, invoiceId: string, storeId: string, templateId?: string): Promise<{
        pdfUrl: string;
        fileName: string;
        generatedInvoiceId: any;
    }>;
    uploadInvoiceBrandingLogo(user: User, dto: UpdateInvoiceLogoDto, ip: string): Promise<{
        logoUrl: string;
        logoStorageKey: string;
        storeId: string | null;
        branding: any;
    }>;
}
