import { productStatusEnum, productTypeEnum, ProductLinkType } from 'src/drizzle/schema';
export declare class CreateProductImageDto {
    base64: string;
    altText?: string;
    fileName?: string;
    mimeType?: string;
    position?: number;
}
export declare class CreateProductDto {
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
    images?: CreateProductImageDto[];
    defaultImageIndex?: number;
}
