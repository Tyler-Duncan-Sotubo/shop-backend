export declare enum BlogPostStatus {
    DRAFT = "draft",
    PUBLISHED = "published"
}
export declare class BlogPostsAdminQueryDto {
    status?: BlogPostStatus;
    storeId?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
