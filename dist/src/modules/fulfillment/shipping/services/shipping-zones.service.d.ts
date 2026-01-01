import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateZoneDto, UpsertZoneLocationDto } from '../dto';
export declare class ShippingZonesService {
    private readonly db;
    private readonly cache;
    private readonly auditService;
    constructor(db: db, cache: CacheService, auditService: AuditService);
    listZones(companyId: string, storeId: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        name: string;
        isActive: boolean;
        priority: number;
        description: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    createZone(companyId: string, dto: CreateZoneDto, user?: User, ip?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        description: string | null;
        metadata: Record<string, any> | null;
        priority: number;
    }>;
    updateZone(companyId: string, zoneId: string, patch: Partial<CreateZoneDto>, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        storeId: string;
        name: string;
        isActive: boolean;
        priority: number;
        description: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteZone(companyId: string, zoneId: string, user?: User, ip?: string): Promise<{
        ok: boolean;
    }>;
    listZoneLocations(companyId: string, zoneId: string): Promise<{
        id: string;
        countryCode: string;
        regionCode: string | null;
        area: string | null;
        zoneName: string;
    }[]>;
    upsertZoneLocation(companyId: string, dto: UpsertZoneLocationDto, user?: User, ip?: string): Promise<{
        id: string;
        createdAt: Date;
        companyId: string;
        zoneId: string;
        countryCode: string;
        regionCode: string | null;
        area: string | null;
        postalCodePattern: string | null;
    }>;
    updateZoneLocation(companyId: string, locationId: string, dto: {
        countryCode?: string;
        state?: string | null;
        area?: string | null;
    }, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        zoneId: string;
        countryCode: string;
        regionCode: string | null;
        area: string | null;
        postalCodePattern: string | null;
        createdAt: Date;
    }>;
    removeZoneLocation(companyId: string, locationId: string, user?: User, ip?: string): Promise<{
        ok: boolean;
    }>;
    resolveZone(companyId: string, storeId: string, countryCode: string, state?: string, area?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        description: string | null;
        metadata: Record<string, any> | null;
        priority: number;
    } | null | undefined>;
}
