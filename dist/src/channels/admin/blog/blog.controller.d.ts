import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { BlogPostIdParamDto, UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { BlogPostsAdminQueryDto } from './dto/blog-posts-admin-query.dto';
import { BlogService } from 'src/domains/blog/blog.service';
import { BlogPostsReportService } from 'src/domains/blog/blog-posts-report.service';
export declare class BlogController extends BaseController {
    private readonly blogService;
    private readonly blogPostsReportService;
    constructor(blogService: BlogService, blogPostsReportService: BlogPostsReportService);
    create(user: User, dto: CreateBlogPostDto, ip: string): Promise<{
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
    }>;
    listAdmin(user: User, filters?: BlogPostsAdminQueryDto): Promise<{
        rows: {
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
        count: number;
    }>;
    getByIdAdmin(user: User, params: BlogPostIdParamDto): Promise<{
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
        products: {
            [x: string]: any;
        }[];
    }>;
    update(user: User, params: BlogPostIdParamDto, dto: UpdateBlogPostDto, ip: string): Promise<{
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
    }>;
    publish(user: User, params: BlogPostIdParamDto, ip: string): Promise<{
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
    }>;
    unpublish(user: User, params: BlogPostIdParamDto, ip: string): Promise<{
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
    }>;
    remove(user: User, params: BlogPostIdParamDto, ip: string): Promise<{
        message: string;
    }>;
    exportPosts(user: User, format?: 'csv' | 'excel', storeId?: string, status?: string, search?: string, includeProducts?: string, includeSeo?: string, includeContent?: string): Promise<{
        url: string | null;
    }>;
}
