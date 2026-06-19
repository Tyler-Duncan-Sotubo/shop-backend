import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CreditService } from "../../credits/credits.service";
import { BillingPaystackService } from './billing-paystack.service';
export declare const CREDIT_BUNDLES: readonly [{
    readonly credits: 1000;
    readonly amountNGN: 3000;
    readonly label: "1,000 credits";
}, {
    readonly credits: 5000;
    readonly amountNGN: 12500;
    readonly label: "5,000 credits";
}, {
    readonly credits: 10000;
    readonly amountNGN: 22000;
    readonly label: "10,000 credits";
}, {
    readonly credits: 25000;
    readonly amountNGN: 50000;
    readonly label: "25,000 credits";
}];
export type CreditBundle = (typeof CREDIT_BUNDLES)[number];
export declare class CreditTopupService {
    private readonly db;
    private readonly credits;
    private readonly billingPaystack;
    private readonly logger;
    constructor(db: db, credits: CreditService, billingPaystack: BillingPaystackService);
    getBundles(): readonly [{
        readonly credits: 1000;
        readonly amountNGN: 3000;
        readonly label: "1,000 credits";
    }, {
        readonly credits: 5000;
        readonly amountNGN: 12500;
        readonly label: "5,000 credits";
    }, {
        readonly credits: 10000;
        readonly amountNGN: 22000;
        readonly label: "10,000 credits";
    }, {
        readonly credits: 25000;
        readonly amountNGN: 50000;
        readonly label: "25,000 credits";
    }];
    initiate(companyId: string, userEmail: string, credits: number): Promise<{
        reference: string;
        authorizationUrl: any;
        accessCode: any;
        credits: 10000 | 5000 | 1000 | 25000;
        amountNGN: 3000 | 12500 | 22000 | 50000;
    }>;
    confirm(paystackReference: string): Promise<void>;
    verifyAndConfirm(companyId: string, paystackReference: string): Promise<void>;
    getHistory(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        credits: number;
        amountNGN: number;
        status: "paid" | "pending" | "failed" | "refunded";
        paystackReference: string;
        paystackAccessCode: string | null;
        paidAt: Date | null;
        metadata: unknown;
    }[]>;
    getPending(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        credits: number;
        amountNGN: number;
        status: "paid" | "pending" | "failed" | "refunded";
        paystackReference: string;
        paystackAccessCode: string | null;
        paidAt: Date | null;
        metadata: unknown;
    }[]>;
}
