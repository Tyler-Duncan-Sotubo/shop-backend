import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { AwsService } from 'src/infrastructure/aws/aws.service';
export declare class PaymentHelpersService {
    private readonly db;
    private readonly aws;
    constructor(db: DbType, aws: AwsService);
    sanitizeFileName(name: string): string;
    assertEvidenceMime(mimeType: string): void;
    uploadPaymentEvidenceTx(tx: any, args: {
        companyId: string;
        paymentId: string;
        userId: string;
        dataUrl: string;
        fileName?: string;
        note?: string;
    }): Promise<any>;
    allocatePaymentToInvoiceTx(tx: any, dto: {
        companyId: string;
        invoiceId: string;
        paymentId: string;
        amountMinor: number;
        createdByUserId: string;
        invoicesTable: any;
    }): Promise<void>;
    formatReceiptNumber(seq: number): string;
    nextReceiptSequenceTx(tx: any, companyId: string): Promise<number>;
    createReceiptForPaymentTx(tx: any, args: {
        companyId: string;
        paymentId: string;
        invoiceId?: string | null;
        orderId?: string | null;
        invoiceNumber?: string | null;
        orderNumber?: string | null;
        currency: string;
        amountMinor: number;
        method: any;
        reference?: string | null;
        customerSnapshot?: any;
        storeSnapshot?: any;
        meta?: any;
        createdByUserId?: string | null;
    }): Promise<any>;
    getOrderNumberTx(tx: any, companyId: string, orderId?: string | null): Promise<any>;
    presignPaymentEvidenceUpload(params: {
        companyId: string;
        paymentId: string;
        fileName: string;
        mimeType: string;
        expiresInSeconds?: number;
        publicRead?: boolean;
        requirePendingBankTransfer?: boolean;
        paymentsTable: any;
    }): Promise<{
        upload: {
            key: string;
            fileName: string;
            mimeType: string;
            uploadUrl: string;
            url: string;
        };
    }>;
    finalizePaymentEvidenceUpload(params: {
        companyId: string;
        paymentId: string;
        key: string;
        url?: string | null;
        fileName?: string | null;
        mimeType?: string | null;
        note?: string | null;
        uploadedByUserId?: string | null;
        requirePendingBankTransfer?: boolean;
        paymentsTable: any;
    }): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        paymentId: string;
        url: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number | null;
        kind: string;
        note: string | null;
        uploadedByUserId: string | null;
    }>;
    getPaymentEvidence(companyId: string, paymentId: string): Promise<{
        id: string;
        companyId: string;
        paymentId: string;
        url: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number | null;
        kind: string;
        note: string | null;
        uploadedByUserId: string | null;
        createdAt: Date;
    }[]>;
}
