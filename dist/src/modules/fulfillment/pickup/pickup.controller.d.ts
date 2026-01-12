import { PickupService } from './pickup.service';
import { CreatePickupLocationDto } from './dto/create-pickup.dto';
import { User } from 'src/common/types/user.type';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class PickupController extends BaseController {
    private readonly pickup;
    constructor(pickup: PickupService);
    listStoreFront(companyId: string, storeId: string, state?: string): Promise<{
        id: string;
        name: string;
        address1: string;
        address2: string | null;
        instructions: string | null;
        state: string;
        inventoryLocationId: string;
        inventoryName: string;
    }[]>;
    list(user: User, storeId: string): Promise<{
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
    create(user: User, dto: CreatePickupLocationDto, ip: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        companyId: string;
        storeId: string;
        state: string;
        inventoryLocationId: string;
        address: Record<string, any>;
        instructions: string | null;
        leadTimeMinutes: number | null;
    }>;
    update(user: User, id: string, dto: UpdatePickupDto, ip: string): Promise<{
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
    delete(user: User, id: string, ip: string): Promise<{
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
