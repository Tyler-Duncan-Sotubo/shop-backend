import { db } from "../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../infrastructure/cache/cache.service";
import { CreditChannel } from './inputs/credits.types';
export declare class CreditService {
    private readonly db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private bumpCompany;
    getBalance(companyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        balance: number;
        lifetimeCredits: number;
    } | {
        balance: number;
        lifetimeCredits: number;
    }>;
    getTransactions(companyId: string, opts?: {
        channel?: CreditChannel;
        limit?: number;
        offset?: number;
    }): Promise<{
        rows: {
            id: string;
            createdAt: Date;
            companyId: string;
            channel: "email" | "sms";
            type: "topup" | "send" | "refund" | "adjustment";
            amount: number;
            balanceAfter: number;
            referenceType: string | null;
            referenceId: string | null;
            note: string | null;
        }[];
        count: number;
        limit: number;
        offset: number;
    }>;
    topUp(companyId: string, amount: number, channel: CreditChannel, note?: string): Promise<{
        balance: number;
        lifetimeCredits: number;
        transaction: {
            id: string;
            createdAt: Date;
            companyId: string;
            type: "topup" | "send" | "refund" | "adjustment";
            channel: "email" | "sms";
            note: string | null;
            amount: number;
            balanceAfter: number;
            referenceType: string | null;
            referenceId: string | null;
        };
    }>;
    debit(companyId: string, amount: number, channel: CreditChannel, referenceType: string, referenceId: string): Promise<{
        balance: number;
        transaction: {
            id: string;
            createdAt: Date;
            companyId: string;
            type: "topup" | "send" | "refund" | "adjustment";
            channel: "email" | "sms";
            note: string | null;
            amount: number;
            balanceAfter: number;
            referenceType: string | null;
            referenceId: string | null;
        };
    }>;
    refund(companyId: string, amount: number, channel: CreditChannel, referenceType: string, referenceId: string, note?: string): Promise<{
        balance: number;
        transaction: {
            id: string;
            createdAt: Date;
            companyId: string;
            type: "topup" | "send" | "refund" | "adjustment";
            channel: "email" | "sms";
            note: string | null;
            amount: number;
            balanceAfter: number;
            referenceType: string | null;
            referenceId: string | null;
        };
    }>;
    adjust(companyId: string, amount: number, channel: CreditChannel, note: string): Promise<{
        balance: number;
        transaction: {
            id: string;
            createdAt: Date;
            companyId: string;
            type: "topup" | "send" | "refund" | "adjustment";
            channel: "email" | "sms";
            note: string | null;
            amount: number;
            balanceAfter: number;
            referenceType: string | null;
            referenceId: string | null;
        };
    }>;
}
