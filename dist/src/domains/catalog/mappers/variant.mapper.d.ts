import { productVariants } from 'src/infrastructure/drizzle/schema';
export type VariantRow = typeof productVariants.$inferSelect;
export interface VariantImageResponse {
    id: string;
    url: string;
    altText?: string | null;
    position?: number | null;
}
export interface inventoryItemsResponse {
    stockQuantity: number | null;
    lowStockThreshold: number | null;
}
export interface VariantResponse {
    id: string;
    variantId: number;
    productId: string;
    title: string | null;
    sku: string | null;
    barcode: string | null;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    isActive: boolean;
    regularPrice: number;
    salePrice: number | null;
    effectivePrice: number;
    currency: string;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export interface VariantResponseWithImage extends VariantResponse {
    image: VariantImageResponse | null;
    inventory: inventoryItemsResponse | null;
}
export declare function mapVariantToResponse(row: VariantRow): VariantResponse;
export declare function mapVariantToResponseWithImage(row: VariantRow, image: VariantImageResponse | null, inventory: inventoryItemsResponse | null): VariantResponseWithImage;
