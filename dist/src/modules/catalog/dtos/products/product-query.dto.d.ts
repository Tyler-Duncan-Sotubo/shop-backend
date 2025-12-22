import { productStatusEnum, productTypeEnum } from 'src/drizzle/schema';
export declare class ProductQueryDto {
    storeId?: string;
    search?: string;
    status?: (typeof productStatusEnum.enumValues)[number];
    productType?: (typeof productTypeEnum.enumValues)[number];
    limit?: number;
    offset?: number;
    categoryId?: string;
    attr?: Record<string, string | string[]>;
}
