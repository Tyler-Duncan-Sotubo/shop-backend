import { db } from 'src/infrastructure/drizzle/types/drizzle';
export declare class InventoryAvailabilityService {
    private readonly db;
    constructor(db: db);
    assertAvailable(companyId: string, locationId: string, variantId: string, requiredQty: number): Promise<void>;
    getWarehouseLocationId(companyId: string, storeId: string): Promise<string>;
    resolveBestOrigin(companyId: string, items: {
        variantId: string;
        quantity: number;
    }[]): Promise<string | null>;
}
