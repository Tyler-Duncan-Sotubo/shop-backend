import { BaseController } from "../../../../infrastructure/interceptor/base.controller";
import { PickupService } from "../../../../domains/fulfillment/pickup/pickup.service";
export declare class PickupController extends BaseController {
    private readonly pickup;
    constructor(pickup: PickupService);
    listStoreFront(companyId: string, storeId: string, state?: string): Promise<{
        id: string;
        name: string;
        address1: any;
        address2: any;
        instructions: string | null;
        state: string;
        inventoryLocationId: string;
        inventoryName: string;
    }[]>;
}
