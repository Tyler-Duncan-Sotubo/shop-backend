import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { AwsService } from "../../../infrastructure/aws/aws.service";
import { AuditService } from "../../audit/audit.service";
export declare class QuotePdfService {
    private readonly db;
    private readonly awsService;
    private readonly auditService;
    private readonly DEFAULT_LOGO_URL;
    constructor(db: db, awsService: AwsService, auditService: AuditService);
    generateAndUploadPdf(params: {
        companyId: string;
        generatedBy: string;
        quoteId: string;
        storeId?: string | null;
    }): Promise<{
        pdfUrl: string;
        fileName: string;
    }>;
    private renderQuoteTemplate;
    private getBranding;
    private normalizeBranding;
    private htmlToPdf;
}
