export declare class UpdateCategoryDto {
    name?: string;
    slug?: string;
    description?: string;
    parentId?: string | null;
    isActive?: boolean;
    metadata?: Record<string, any>;
    imageMediaId?: string;
    afterContentHtml?: string;
    metaTitle?: string;
    metaDescription?: string;
    base64Image?: string;
    imageMimeType?: string;
    imageFileName?: string;
    imageAltText?: string;
    removeImage?: boolean;
}
