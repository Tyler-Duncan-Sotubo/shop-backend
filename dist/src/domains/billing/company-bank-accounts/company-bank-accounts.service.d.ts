import { db } from "../../../infrastructure/drizzle/types/drizzle";
export interface CreateBankAccountInput {
    label: string;
    bankName: string;
    accountName: string;
    accountNumber: string;
    tin?: string | null;
    sortOrder?: number;
}
export type UpdateBankAccountInput = Partial<CreateBankAccountInput>;
export declare class CompanyBankAccountsService {
    private readonly db;
    constructor(db: db);
    list(companyId: string): Promise<{
        id: string;
        companyId: string;
        label: string;
        bankName: string;
        accountName: string;
        accountNumber: string;
        tin: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findById(companyId: string, id: string): Promise<{
        id: string;
        companyId: string;
        label: string;
        bankName: string;
        accountName: string;
        accountNumber: string;
        tin: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(companyId: string, input: CreateBankAccountInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        label: string;
        bankName: string;
        accountName: string;
        accountNumber: string;
        tin: string | null;
        sortOrder: number;
    }>;
    update(companyId: string, id: string, input: UpdateBankAccountInput): Promise<{
        id: string;
        companyId: string;
        label: string;
        bankName: string;
        accountName: string;
        accountNumber: string;
        tin: string | null;
        sortOrder: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(companyId: string, id: string): Promise<{
        success: boolean;
    }>;
}
