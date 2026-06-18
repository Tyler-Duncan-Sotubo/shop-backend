import { CreatePickupLocationDto } from './dto/create-pickup.dto';
import { User } from "../../common/types/user.type";
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { PickupService } from "../../../../domains/fulfillment/pickup/pickup.service";
export declare class PickupController extends BaseController {
    private readonly pickup;
    constructor(pickup: PickupService);
    list(user: User, storeId: string): Promise<{
        id: string;
        name: string;
        isActive: boolean;
        storeId: string;
        inventoryName: string;
        inventoryLocationId: string;
        state: string;
        address1: any;
        address2: any;
        instructions: string | null;
    }[]>;
    create(user: User, dto: CreatePickupLocationDto, ip: string): Promise<{
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
