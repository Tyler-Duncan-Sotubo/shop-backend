import { productStatusEnum, productTypeEnum, ProductLinkType } from 'src/drizzle/schema';
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
    base64Image?: string;
    imageAltText?: string;
    imageFileName?: string;
    imageMimeType?: string;
}
