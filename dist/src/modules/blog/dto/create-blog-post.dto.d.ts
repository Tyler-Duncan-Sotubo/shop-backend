export declare enum BlogPostStatus {
    DRAFT = "draft",
    PUBLISHED = "published"
}
export declare class BlogPostProductDto {
    productId: string;
    sortOrder?: number;
}
export declare class CreateBlogPostDto {
    title: string;
    slug: string;
    excerpt?: string;
    coverImageUrl?: string;
    content: string;
    status?: BlogPostStatus;
    isFeatured?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    focusKeyword?: string;
    products?: BlogPostProductDto[];
    base64CoverImage?: string;
    coverImageAltText?: string;
}
