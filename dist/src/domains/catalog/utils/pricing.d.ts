export interface PriceFields {
    regularPrice: string | number | null;
    salePrice?: string | number | null;
    saleStartAt?: Date | null;
    saleEndAt?: Date | null;
}
export declare function isSaleActive(variant: PriceFields): boolean;
export declare function getEffectivePrice(variant: PriceFields): number;
