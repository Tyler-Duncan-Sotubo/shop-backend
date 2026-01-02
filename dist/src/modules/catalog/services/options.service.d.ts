import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateOptionDto, CreateOptionValueDto, UpdateOptionDto, UpdateOptionValueDto } from '../dtos/options';
export declare class OptionsService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    assertCompanyExists(companyId: string): Promise<{
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
    assertProductBelongsToCompany(companyId: string, productId: string): Promise<{
        [x: string]: any;
    }>;
    findOptionByIdOrThrow(companyId: string, optionId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        productId: string;
        position: number;
    }>;
    findOptionValueByIdOrThrow(companyId: string, valueId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        value: string;
        position: number;
        productOptionId: string;
    }>;
    getOptionsWithValues(companyId: string, productId: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        productId: string;
        position: number;
        values: {
            [x: string]: any;
        }[];
    }[]>;
    createOption(companyId: string, productId: string, dto: CreateOptionDto, user?: User, ip?: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        productId: string;
        position: number;
    }>;
    updateOption(companyId: string, optionId: string, dto: UpdateOptionDto, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        productId: string;
        name: string;
        position: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteOption(companyId: string, optionId: string, user?: User, ip?: string): Promise<{
        success: boolean;
        disabledVariantsForPosition: number;
    }>;
    createOptionValue(companyId: string, optionId: string, dto: CreateOptionValueDto, user?: User, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        companyId: string;
        value: string;
        position: number;
        productOptionId: string;
    }>;
    updateOptionValue(companyId: string, valueId: string, dto: UpdateOptionValueDto, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        productOptionId: string;
        value: string;
        position: number;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
    }>;
    deleteOptionValue(companyId: string, valueId: string, user?: User, ip?: string): Promise<{
        success: boolean;
    }>;
}
