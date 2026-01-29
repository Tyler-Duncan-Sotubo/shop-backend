import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
export declare class CheckoutPaymentsService {
    private readonly db;
    constructor(db: DbType);
    private firstRow;
    initBankTransferForCheckout(companyId: string, storeId: string, dto: {
        checkoutId: string;
        customerEmail?: string;
        customerPhone?: string;
    }): Promise<{
        payment: {
            id: string;
            status: "pending" | "succeeded" | "reversed";
            method: "bank_transfer" | "pos" | "cash" | "manual" | "gateway";
            currency: string;
            amountMinor: number;
        };
        order: {
            id: any;
            orderNumber: any;
        };
        invoice: {
            id: any;
            number: any;
            status: any;
            outstandingMinor: number;
            currency: any;
        };
        bankDetails: any;
    }>;
}
