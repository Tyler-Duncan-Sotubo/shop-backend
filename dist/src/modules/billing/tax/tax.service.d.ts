import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
export declare class TaxService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    private tags;
    private cacheKeyList;
    create(user: User, dto: CreateTaxDto, ip?: string): Promise<any>;
    list(companyId: string, opts?: {
        active?: boolean;
        storeId?: string | null;
    }): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    getById(companyId: string, taxId: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(user: User, taxId: string, dto: UpdateTaxDto, ip?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivate(user: User, taxId: string, ip?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setDefault(user: User, taxId: string, ip?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string | null;
        name: string;
        code: string | null;
        rateBps: number;
        isInclusive: boolean;
        isDefault: boolean;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
