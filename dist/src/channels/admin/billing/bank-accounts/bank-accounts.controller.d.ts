import { User } from '../../common/types/user.type';
import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { CompanyBankAccountsService } from "../../../../domains/billing/company-bank-accounts/company-bank-accounts.service";
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
export declare class BankAccountsController extends BaseController {
    private readonly service;
    constructor(service: CompanyBankAccountsService);
    list(user: User): Promise<{
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
    create(user: User, dto: CreateBankAccountDto): Promise<{
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
    update(user: User, id: string, dto: UpdateBankAccountDto): Promise<{
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
    remove(user: User, id: string): Promise<{
        success: boolean;
    }>;
}
