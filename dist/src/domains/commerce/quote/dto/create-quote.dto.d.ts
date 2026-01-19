declare class CreateQuoteItemDto {
    productId?: string;
    variantId?: string;
    name: string;
    variantLabel?: string;
    attributes?: Record<string, string | null>;
    imageUrl?: string;
    quantity: number;
}
export declare class CreateQuoteDto {
    storeId: string;
    customerEmail: string;
    customerNote?: string;
    status?: string;
    meta?: Record<string, unknown>;
    expiresAt?: Date;
    items: CreateQuoteItemDto[];
}
export {};
