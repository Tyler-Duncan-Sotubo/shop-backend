export declare class UpdateVariantDto {
    removeSalePrice: boolean;
    title?: string;
    sku?: string;
    barcode?: string;
    option1?: string;
    option2?: string;
    option3?: string;
    regularPrice?: string;
    salePrice?: string;
    weight?: string;
    length?: string;
    width?: string;
    height?: string;
    metadata?: Record<string, unknown>;
    base64Image?: string;
    imageAltText?: string;
    imageFileName?: string;
    imageMimeType?: string;
    stockQuantity?: number;
    safetyStock?: number;
    lowStockThreshold?: number;
    imageKey?: string;
    imageUrl?: string;
    imagePosition?: number;
}
