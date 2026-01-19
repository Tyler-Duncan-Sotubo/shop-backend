import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateCarrierDto } from '../dto';
export declare class ShippingCarriersService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    listCarriers(companyId: string): Promise<{
        id: string;
        companyId: string;
        providerKey: string;
        name: string;
        isActive: boolean;
        settings: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createCarrier(companyId: string, dto: CreateCarrierDto, user?: User, ip?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        providerKey: string;
        settings: Record<string, any> | null;
    }>;
    updateCarrier(companyId: string, carrierId: string, patch: Partial<CreateCarrierDto>, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        providerKey: string;
        name: string;
        isActive: boolean;
        settings: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteCarrier(companyId: string, carrierId: string, user?: User, ip?: string): Promise<{
        ok: boolean;
    }>;
}
