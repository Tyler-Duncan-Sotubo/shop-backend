import { BaseController } from "../../../infrastructure/interceptor/base.controller";
import { User } from "../common/types/user.type";
import { CreditService } from "../../../domains/credits/credits.service";
import { AdjustDto, GetTransactionsDto, TopUpDto } from './dto/credits.dto';
export declare class CreditsController extends BaseController {
    private readonly credits;
    constructor(credits: CreditService);
    getBalance(user: User): Promise<{
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
    getTransactions(user: User, q: GetTransactionsDto): Promise<{
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
    topUp(user: User, body: TopUpDto): Promise<{
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
    adjust(user: User, body: AdjustDto): Promise<{
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
