import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { BlogService } from 'src/domains/blog/blog.service';
export declare class BlogController extends BaseController {
    private readonly blogService;
    constructor(blogService: BlogService);
    listPublic(storeId: string, page?: string, limit?: string): Promise<{
        items: {
            id: string;
            title: string;
            slug: string;
            storeId: string;
            excerpt: string | null;
            coverImageUrl: string | null;
            focusKeyword: string | null;
            content: string;
            status: string;
            publishedAt: Date | null;
            isFeatured: boolean;
            seoTitle: string | null;
            seoDescription: string | null;
            createdAt: Date;
            updatedAt: Date;
        }[];
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
    getBySlugPublic(storeId: string, slug: string): Promise<{
        id: string;
        slug: string;
        createdAt: Date;
        updatedAt: Date;
        storeId: string;
        status: string;
        title: string;
        seoTitle: string | null;
        seoDescription: string | null;
        content: string;
        excerpt: string | null;
        coverImageUrl: string | null;
        focusKeyword: string | null;
        publishedAt: Date | null;
        isFeatured: boolean;
        products: {
            [x: string]: any;
        }[];
    }>;
}
