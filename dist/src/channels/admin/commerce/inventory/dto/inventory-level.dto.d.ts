export declare class SetInventoryLevelDto {
    productVariantId: string;
    quantity: number;
    safetyStock: number;
}
export declare class AdjustInventoryLevelDto {
    productVariantId: string;
    locationId: string;
    delta: number;
}
