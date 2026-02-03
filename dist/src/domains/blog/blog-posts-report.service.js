"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogPostsReportService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
const export_util_1 = require("../../infrastructure/exports/export.util");
let BlogPostsReportService = class BlogPostsReportService {
    constructor(db, aws) {
        this.db = db;
        this.aws = aws;
    }
    todayString() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }
    async exportAndUpload(rows, columns, filenameBase, companyId, folder, format) {
        if (!rows.length) {
            throw new common_1.BadRequestException(`No data available for ${filenameBase}`);
        }
        const filePath = format === 'excel'
            ? await export_util_1.ExportUtil.exportToExcel(rows, columns, filenameBase)
            : export_util_1.ExportUtil.exportToCSV(rows, columns, filenameBase);
        return this.aws.uploadFilePath(filePath, companyId, 'report', folder);
    }
    async exportBlogPostsToS3(companyId, opts) {
        const format = opts?.format ?? 'csv';
        const whereClauses = [];
        if (opts?.storeId)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.blogPosts.storeId, opts.storeId));
        if (opts?.status)
            whereClauses.push((0, drizzle_orm_1.eq)(schema_1.blogPosts.status, opts.status));
        if (opts?.search)
            whereClauses.push((0, drizzle_orm_1.ilike)(schema_1.blogPosts.title, `%${opts.search}%`));
        const base = await this.db
            .select({
            id: schema_1.blogPosts.id,
            storeId: schema_1.blogPosts.storeId,
            title: schema_1.blogPosts.title,
            slug: schema_1.blogPosts.slug,
            excerpt: schema_1.blogPosts.excerpt,
            coverImageUrl: schema_1.blogPosts.coverImageUrl,
            status: schema_1.blogPosts.status,
            publishedAt: schema_1.blogPosts.publishedAt,
            isFeatured: schema_1.blogPosts.isFeatured,
            seoTitle: schema_1.blogPosts.seoTitle,
            seoDescription: schema_1.blogPosts.seoDescription,
            focusKeyword: schema_1.blogPosts.focusKeyword,
            content: schema_1.blogPosts.content,
        })
            .from(schema_1.blogPosts)
            .where(whereClauses.length ? (0, drizzle_orm_1.and)(...whereClauses) : undefined)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.blogPosts.publishedAt), (0, drizzle_orm_1.desc)(schema_1.blogPosts.createdAt))
            .execute();
        if (!base.length)
            return null;
        const postIds = base.map((p) => p.id);
        const productsByPost = new Map();
        if (opts?.includeProducts) {
            const links = await this.db
                .select({
                postId: schema_1.blogPostProducts.postId,
                productName: schema_1.products.name,
            })
                .from(schema_1.blogPostProducts)
                .innerJoin(schema_1.products, (0, drizzle_orm_1.eq)(schema_1.products.id, schema_1.blogPostProducts.productId))
                .where((0, drizzle_orm_1.inArray)(schema_1.blogPostProducts.postId, postIds))
                .execute();
            for (const r of links) {
                const list = productsByPost.get(r.postId) ?? [];
                list.push(r.productName);
                productsByPost.set(r.postId, list);
            }
        }
        const rows = base.map((p) => {
            return {
                storeId: p.storeId,
                title: p.title,
                slug: p.slug,
                permalink: `/blog/${p.slug}`,
                status: p.status,
                published_at: p.publishedAt
                    ? new Date(p.publishedAt).toISOString()
                    : '',
                is_featured: p.isFeatured ? 'true' : 'false',
                excerpt: p.excerpt ?? '',
                cover_image_url: p.coverImageUrl ?? '',
                ...(opts?.includeProducts
                    ? { linked_products: (productsByPost.get(p.id) ?? []).join(', ') }
                    : {}),
                ...(opts?.includeSeo
                    ? {
                        seo_title: p.seoTitle ?? '',
                        seo_description: p.seoDescription ?? '',
                        focus_keyword: p.focusKeyword ?? '',
                    }
                    : {}),
                ...(opts?.includeContent ? { content: p.content ?? '' } : {}),
            };
        });
        const columns = [
            { field: 'storeId', title: 'Store ID' },
            { field: 'title', title: 'Title' },
            { field: 'slug', title: 'Slug' },
            { field: 'permalink', title: 'Permalink' },
            { field: 'status', title: 'Status' },
            { field: 'published_at', title: 'Published At' },
            { field: 'is_featured', title: 'Featured' },
            { field: 'excerpt', title: 'Excerpt' },
            { field: 'cover_image_url', title: 'Cover Image URL' },
        ];
        if (opts?.includeProducts) {
            columns.push({ field: 'linked_products', title: 'Linked Products' });
        }
        if (opts?.includeSeo) {
            columns.push({ field: 'seo_title', title: 'SEO Title' }, { field: 'seo_description', title: 'SEO Description' }, { field: 'focus_keyword', title: 'Focus Keyword' });
        }
        if (opts?.includeContent) {
            columns.push({ field: 'content', title: 'Content (HTML)' });
        }
        const storePart = opts?.storeId ? `store_${opts.storeId}` : 'allstores';
        const statusPart = opts?.status ?? 'allstatus';
        const filename = `blog_posts_${companyId}_${storePart}_${statusPart}_${this.todayString()}`;
        return this.exportAndUpload(rows, columns, filename, companyId, 'blog-posts', format);
    }
};
exports.BlogPostsReportService = BlogPostsReportService;
exports.BlogPostsReportService = BlogPostsReportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, aws_service_1.AwsService])
], BlogPostsReportService);
//# sourceMappingURL=blog-posts-report.service.js.map