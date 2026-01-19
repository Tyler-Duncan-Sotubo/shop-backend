import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
export declare class PaymentReceiptService {
    private readonly db;
    private readonly aws;
    private readonly DEFAULT_LOGO_URL;
    constructor(db: DbType, aws: AwsService);
    private methodLabel;
    private formatMinor;
    private getBranding;
    private normalizeBranding;
    getReceiptViewModel(companyId: string, paymentId: string): Promise<{
        receipt: {
            receiptNumber: string;
            issuedAt: string;
            orderNumber: any;
            invoiceNumber: any;
        };
        payment: {
            amount: string;
            amountMinor: number;
            currency: string;
            method: "bank_transfer" | "pos" | "cash" | "manual" | "gateway";
            methodLabel: string;
            reference: string | null;
        };
        invoice: {
            balance: string;
            balanceMinor: number;
        } | null;
        supplier: {
            name: any;
            address: any;
            email: any;
            phone: any;
        };
        branding: {
            logoUrl: any;
            footerNote: any;
        };
    }>;
    generateReceiptPdfUrl(companyId: string, paymentId: string): Promise<{
        pdfUrl: string;
        storageKey: string;
    }>;
    private htmlToPdf;
    attachPdfToReceiptByPaymentId(companyId: string, paymentId: string, pdfUrl: string, storageKey: string): Promise<{
        ok: boolean;
    }>;
}
