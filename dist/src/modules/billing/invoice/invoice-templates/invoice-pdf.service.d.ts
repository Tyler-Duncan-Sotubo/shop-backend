import { db } from 'src/drizzle/types/drizzle';
import { AwsService } from 'src/common/aws/aws.service';
import { AuditService } from 'src/modules/audit/audit.service';
export declare class InvoicePdfService {
    private readonly db;
    private readonly awsService;
    private readonly auditService;
    private readonly DEFAULT_LOGO_URL;
    constructor(db: db, awsService: AwsService, auditService: AuditService);
    generatePreviewHtml(companyId: string, opts?: {
        templateId?: string;
        storeId?: string | null;
    }): Promise<{
        html: string;
        template: {
            id: string;
            key: string;
            version: string;
            name: string;
        };
        usingDefaultTemplate: boolean;
    }>;
    generatePreviewPdf(companyId: string, opts?: {
        templateId?: string;
        storeId?: string | null;
    }): Promise<{
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
    generateAndUploadPdf(params: {
        companyId: string;
        generatedBy: string;
        invoiceId: string;
        templateId?: string;
        storeId?: string | null;
    }): Promise<{
        pdfUrl: string;
        fileName: string;
        generatedInvoiceId: any;
    }>;
    private getBranding;
    private resolveTemplate;
    private assertTemplateVariables;
    private normalizeBrandingForRender;
    private buildInvoiceViewModel;
    private getSampleInvoiceViewModel;
    private formatMinor;
    private htmlToPdf;
}
