import { productStatusEnum, productTypeEnum, ProductLinkType } from 'src/infrastructure/drizzle/schema';
export declare class UpdateProductImageDto {
    key: string;
    url?: string;
    altText?: string;
    fileName?: string;
    mimeType?: string;
    position?: number;
}
export declare class UpdateProductDto {
    storeId: string;
    name: string;
    description?: string;
    slug?: string;
    status?: (typeof productStatusEnum.enumValues)[number];
    productType?: (typeof productTypeEnum.enumValues)[number];
    isGiftCard?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    metadata?: Record<string, any>;
    categoryIds?: string[];
    links?: Partial<Record<ProductLinkType, string[]>>;
    images?: UpdateProductImageDto[];
    defaultImageIndex?: number;
    moq?: number;
    sku?: string;
    barcode?: string;
    regularPrice?: string;
    salePrice?: string;
    stockQuantity?: string;
    lowStockThreshold?: string;
    weight?: string;
    length?: string;
    width?: string;
    height?: string;
}
