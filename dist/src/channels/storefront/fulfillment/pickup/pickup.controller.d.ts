import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PickupService } from 'src/domains/fulfillment/pickup/pickup.service';
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
}
