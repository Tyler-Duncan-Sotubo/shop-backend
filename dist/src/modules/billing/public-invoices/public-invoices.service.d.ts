import { db } from 'src/drizzle/types/drizzle';
import { InvoicePdfService } from '../invoice/invoice-templates/invoice-pdf.service';
export declare class PublicInvoicesService {
    private readonly db;
    private readonly invoicePdfService;
    constructor(db: db, invoicePdfService: InvoicePdfService);
    private newToken;
    ensureLink(params: {
        companyId: string;
        invoiceId: string;
        createdBy: string;
        expiresAt?: Date | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        expiresAt: Date | null;
        meta: unknown;
        invoiceId: string;
        token: string;
        enabled: boolean;
        viewCount: number;
        lastViewedAt: Date | null;
        createdBy: string;
    }>;
    revokeLink(companyId: string, invoiceId: string): Promise<{
        id: string;
        companyId: string;
        invoiceId: string;
        token: string;
        enabled: boolean;
        expiresAt: Date | null;
        viewCount: number;
        lastViewedAt: Date | null;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        meta: unknown;
    }>;
    rotateLink(params: {
        companyId: string;
        invoiceId: string;
        rotatedBy: string;
    }): Promise<{
        id: string;
        companyId: string;
        invoiceId: string;
        token: string;
        enabled: boolean;
        expiresAt: Date | null;
        viewCount: number;
        lastViewedAt: Date | null;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
        meta: unknown;
    }>;
    private assertLinkActive;
    getPublicInvoiceByToken(token: string): Promise<{
        link: {
            id: string;
            companyId: string;
            invoiceId: string;
            token: string;
            enabled: boolean;
            expiresAt: Date | null;
            viewCount: number;
            lastViewedAt: Date | null;
            createdBy: string;
            createdAt: Date;
            updatedAt: Date;
            meta: unknown;
        };
        data: any;
    }>;
    getPublicPdfUrlByToken(token: string): Promise<{
        pdfUrl: any;
        fileName: any;
    }>;
}
