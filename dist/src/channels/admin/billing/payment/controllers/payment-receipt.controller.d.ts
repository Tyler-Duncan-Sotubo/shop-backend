import { User } from 'src/channels/admin/common/types/user.type';
import { PaymentReceiptService } from 'src/domains/billing/payment/services/payment-receipt.service';
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
        };
    }>;
    generateReceiptPdfAdmin(user: User, paymentId: string): Promise<{
        data: {
            pdfUrl: string;
            storageKey: string;
        };
    }>;
}
