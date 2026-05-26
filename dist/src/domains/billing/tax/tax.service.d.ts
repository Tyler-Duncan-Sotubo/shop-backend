import { db } from "../../../infrastructure/drizzle/types/drizzle";
import { CacheService } from "../../../infrastructure/cache/cache.service";
import { AuditService } from "../../audit/audit.service";
import { User } from "../../../channels/admin/common/types/user.type";
import { CreateTaxInput, UpdateTaxInput } from './inputs';
export declare class TaxService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    private tags;
    private cacheKeyList;
    create(user: User, dto: CreateTaxInput, ip?: string): Promise<any>;
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
    update(user: User, taxId: string, dto: UpdateTaxInput, ip?: string): Promise<{
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
