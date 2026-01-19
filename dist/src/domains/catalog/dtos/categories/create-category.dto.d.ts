export declare class CreateCategoryDto {
    storeId: string;
    name: string;
    slug?: string;
    description?: string;
    parentId?: string;
    isActive?: boolean;
    metadata?: Record<string, any>;
    imageMediaId?: string;
    uploadKey?: string;
    uploadUrl?: string;
    imageFileName?: string;
    imageMimeType?: string;
    imageAltText?: string;
    afterContentHtml?: string;
    metaTitle?: string;
    metaDescription?: string;
    base64Image?: string;
}
