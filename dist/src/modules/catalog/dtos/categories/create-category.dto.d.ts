export declare class CreateCategoryDto {
    storeId: string;
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
}
