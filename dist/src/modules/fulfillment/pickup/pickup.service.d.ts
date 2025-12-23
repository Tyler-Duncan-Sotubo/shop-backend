import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreatePickupLocationDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
export declare class PickupService {
    private readonly db;
    private readonly auditService;
    constructor(db: db, auditService: AuditService);
    listStorefront(companyId: string, storeId: string, state?: string): Promise<{
        id: string;
        name: string;
        address1: string;
        address2: string | null;
        instructions: string | null;
        state: string;
        inventoryLocationId: string;
        inventoryName: string;
    }[]>;
    listAdmin(companyId: string, storeId?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        storeId: string;
        inventoryName: string;
        inventoryLocationId: string;
        state: string;
        address1: string;
        address2: string | null;
        instructions: string | null;
    }[]>;
    get(companyId: string, id: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        state: string;
        inventoryLocationId: string;
        address: Record<string, any>;
        instructions: string | null;
        leadTimeMinutes: number | null;
    }>;
    create(companyId: string, dto: CreatePickupLocationDto, user?: User, ip?: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        state: string;
        inventoryLocationId: string;
        address: Record<string, any>;
        instructions: string | null;
        leadTimeMinutes: number | null;
    }>;
    update(companyId: string, id: string, dto: UpdatePickupDto, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        inventoryLocationId: string;
        storeId: string;
        name: string;
        isActive: boolean;
        state: string;
        address: Record<string, any>;
        instructions: string | null;
        leadTimeMinutes: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivate(companyId: string, id: string, user?: User, ip?: string): Promise<{
        id: string;
        companyId: string;
        inventoryLocationId: string;
        storeId: string;
        name: string;
        isActive: boolean;
        state: string;
        address: Record<string, any>;
        instructions: string | null;
        leadTimeMinutes: number | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
