import { db } from "../../../infrastructure/drizzle/types/drizzle";
export declare class SubscriptionInvoicesService {
    private readonly db;
    constructor(db: db);
    getByCompany(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        subscriptionId: string | null;
        topupRequestId: string | null;
        type: "subscription" | "credit_topup";
        status: "paid" | "failed" | "refunded";
        amountNGN: number;
        paystackReference: string | null;
        paidAt: Date | null;
    }[]>;
}
