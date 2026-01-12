import { PaymentReceiptService } from './services/payment-receipt.service';
import { User } from 'src/common/types/user.type';
export declare class PaymentReceiptController {
    private readonly receipts;
    constructor(receipts: PaymentReceiptService);
    getReceiptAdmin(user: User, paymentId: string): Promise<{
        data: {
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
                method: "pos" | "bank_transfer" | "cash" | "manual" | "gateway";
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
        };
    }>;
    generateReceiptPdfAdmin(user: User, paymentId: string): Promise<{
        data: {
            pdfUrl: string;
            storageKey: string;
        };
    }>;
    getReceiptStorefront(companyId: string, paymentId: string): Promise<{
        data: {
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
                method: "pos" | "bank_transfer" | "cash" | "manual" | "gateway";
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
        };
    }>;
    generateReceiptPdfStorefront(companyId: string, paymentId: string): Promise<{
        data: {
            pdfUrl: string;
            storageKey: string;
        };
    }>;
}
