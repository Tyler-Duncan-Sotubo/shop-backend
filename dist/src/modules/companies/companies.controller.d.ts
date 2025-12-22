import { CreateCompanyDto } from './dto/create-company.dto';
import { CompaniesService } from './companies.service';
import { User } from '../auth/types/user.type';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompaniesController {
    private readonly companyService;
    constructor(companyService: CompaniesService);
    Register(dto: CreateCompanyDto): Promise<{
        user: {
            id: string;
            email: string;
            companyId: string;
        };
        company: {
            id: string;
            name: string;
            slug: string;
            legalName: string | null;
            country: string | null;
            vatNumber: string | null;
            defaultCurrency: string;
            timezone: string;
            defaultLocale: string;
            billingEmail: string | null;
            billingCustomerId: string | null;
            billingProvider: string | null;
            plan: string;
            trialEndsAt: Date | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            deletedAt: Date | null;
        };
    }>;
    getPaymentSettings(user: User): Promise<{
        id: string;
        name: string;
        slug: string;
        legalName: string | null;
        country: string | null;
        vatNumber: string | null;
        defaultCurrency: string;
        timezone: string;
        defaultLocale: string;
        billingEmail: string | null;
        billingCustomerId: string | null;
        billingProvider: string | null;
        plan: string;
        trialEndsAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    updateCompany(user: User, dto: UpdateCompanyDto): Promise<{
        id: string;
        name: string;
        slug: string;
        legalName: string | null;
        country: string | null;
        vatNumber: string | null;
        defaultCurrency: string;
        timezone: string;
        defaultLocale: string;
        billingEmail: string | null;
        billingCustomerId: string | null;
        billingProvider: string | null;
        plan: string;
        trialEndsAt: Date | null;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
}
