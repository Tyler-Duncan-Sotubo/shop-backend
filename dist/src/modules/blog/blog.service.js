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
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
const cache_service_1 = require("../../common/cache/cache.service");
const audit_service_1 = require("../audit/audit.service");
const schema_1 = require("../../drizzle/schema");
const create_blog_post_dto_1 = require("./dto/create-blog-post.dto");
const aws_service_1 = require("../../common/aws/aws.service");
let BlogService = class BlogService {
    constructor(db, cache, auditService, aws) {
        this.db = db;
        this.cache = cache;
        this.auditService = auditService;
        this.aws = aws;
    }
    async create(user, dto, ip) {
        const existing = await this.db
            .select({ id: schema_1.blogPosts.id })
            .from(schema_1.blogPosts)
            .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.slug, dto.slug))
            .execute();
        if (existing.length > 0) {
            throw new common_1.BadRequestException('Slug already exists');
        }
        const now = new Date();
        const status = dto.status ?? create_blog_post_dto_1.BlogPostStatus.DRAFT;
        return this.db.transaction(async (tx) => {
            const [post] = await tx
                .insert(schema_1.blogPosts)
                .values({
                storeId: dto.storeId,
                title: dto.title,
                slug: dto.slug,
                excerpt: dto.excerpt,
                coverImageUrl: dto.coverImageUrl ?? null,
                content: dto.content,
                status,
                publishedAt: status === create_blog_post_dto_1.BlogPostStatus.PUBLISHED ? now : null,
                isFeatured: dto.isFeatured ?? false,
                seoTitle: dto.seoTitle ?? null,
                seoDescription: dto.seoDescription ?? null,
                focusKeyword: dto.focusKeyword ?? null,
            })
                .returning()
                .execute();
            if (dto.base64CoverImage) {
                const fileName = `${post.id}-cover-${Date.now()}.jpg`;
                const url = await this.aws.uploadImageToS3(user.companyId, fileName, dto.base64CoverImage);
                await tx
                    .update(schema_1.blogPosts)
                    .set({ coverImageUrl: url, updatedAt: new Date() })
                    .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.id, post.id))
                    .execute();
                post.coverImageUrl = url;
            }
            if (dto.products?.length) {
                const ids = dto.products.map((p) => p.productId);
                const found = await tx
                    .select({ id: schema_1.products.id })
                    .from(schema_1.products)
                    .where((0, drizzle_orm_1.inArray)(schema_1.products.id, ids))
                    .execute();
                const foundSet = new Set(found.map((r) => r.id));
                const missing = ids.filter((id) => !foundSet.has(id));
                if (missing.length) {
                    throw new common_1.BadRequestException(`Some products not found: ${missing.join(', ')}`);
                }
                await tx
                    .insert(schema_1.blogPostProducts)
                    .values(dto.products.map((p) => ({
                    postId: post.id,
                    productId: p.productId,
                    sortOrder: p.sortOrder ?? 0,
                })))
                    .onConflictDoNothing()
                    .execute();
            }
            await this.auditService.logAction({
                action: 'create',
                entity: 'blog_post',
                entityId: post.id,
                userId: user.id,
                details: 'Created blog post',
                ipAddress: ip,
                changes: {
                    companyId: user.companyId,
                    slug: post.slug,
                    status: post.status,
                    hasCoverImage: Boolean(dto.base64CoverImage || dto.coverImageUrl),
                },
            });
            await this.cache.bumpCompanyVersion(user.companyId);
            return post;
        });
    }
    async listAdmin(user, filters = {}) {
        return this.cache.getOrSetVersioned(user.companyId, [
            'blog',
            'posts',
            filters.status ?? 'all',
            filters.storeId ?? 'all',
            filters.search ?? 'all',
            filters.limit?.toString() ?? 'default',
            filters.offset?.toString() ?? '0',
        ], async () => {
            const { status, storeId, search, limit = 50, offset = 0 } = filters;
            const conditions = [];
            if (status) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.blogPosts.status, status));
            }
            if (storeId) {
                conditions.push((0, drizzle_orm_1.eq)(schema_1.blogPosts.storeId, storeId));
            }
            if (search) {
                conditions.push((0, drizzle_orm_1.sql) `${schema_1.blogPosts.title} ILIKE ${'%' + search + '%'}`);
            }
            const whereClause = conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined;
            const [{ count }] = await this.db
                .select({
                count: (0, drizzle_orm_1.sql) `count(*)`,
            })
                .from(schema_1.blogPosts)
                .where(whereClause)
                .execute();
            const rows = await this.db
                .select()
                .from(schema_1.blogPosts)
                .where(whereClause)
                .orderBy((0, drizzle_orm_1.desc)(schema_1.blogPosts.createdAt))
                .limit(limit)
                .offset(offset)
                .execute();
            return {
                rows,
                count: Number(count),
            };
        });
    }
    async getByIdAdmin(user, id) {
        return this.cache.getOrSetVersioned(user.companyId, ['blog', 'post', id], async () => {
            const post = await this.db.query.blogPosts.findFirst({
                where: (0, drizzle_orm_1.eq)(schema_1.blogPosts.id, id),
                with: {
                    products: {
                        with: {
                            product: true,
                        },
                    },
                },
            });
            if (!post)
                throw new common_1.NotFoundException('Blog post not found');
            return post;
        });
    }
    async listPublic(storeId, opts) {
        const page = Math.max(1, opts?.page ?? 1);
        const limit = Math.min(50, opts?.limit ?? 10);
        const offset = (page - 1) * limit;
        const whereClause = (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.blogPosts.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.blogPosts.status, create_blog_post_dto_1.BlogPostStatus.PUBLISHED), (0, drizzle_orm_1.sql) `${schema_1.blogPosts.publishedAt} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_1.blogPosts.publishedAt} <= now()`);
        const [{ count }] = await this.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)` })
            .from(schema_1.blogPosts)
            .where(whereClause)
            .execute();
        const items = await this.db
            .select()
            .from(schema_1.blogPosts)
            .where(whereClause)
            .orderBy((0, drizzle_orm_1.desc)(schema_1.blogPosts.publishedAt))
            .limit(limit)
            .offset(offset)
            .execute();
        return {
            items,
            page,
            limit,
            total: Number(count),
            totalPages: Math.ceil(Number(count) / limit),
        };
    }
    async getBySlugPublic(storeId, slug) {
        const post = await this.db.query.blogPosts.findFirst({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.blogPosts.storeId, storeId), (0, drizzle_orm_1.eq)(schema_1.blogPosts.slug, slug), (0, drizzle_orm_1.eq)(schema_1.blogPosts.status, create_blog_post_dto_1.BlogPostStatus.PUBLISHED), (0, drizzle_orm_1.sql) `${schema_1.blogPosts.publishedAt} IS NOT NULL`, (0, drizzle_orm_1.sql) `${schema_1.blogPosts.publishedAt} <= now()`),
            with: {
                products: {
                    with: { product: true },
                },
            },
        });
        if (!post)
            throw new common_1.NotFoundException('Blog post not found');
        return post;
    }
    async update(user, id, dto, ip) {
        const existing = await this.db
            .select()
            .from(schema_1.blogPosts)
            .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.id, id))
            .execute();
        if (existing.length === 0)
            throw new common_1.NotFoundException('Blog post not found');
        if (dto.slug) {
            const slugTaken = await this.db
                .select({ id: schema_1.blogPosts.id })
                .from(schema_1.blogPosts)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.blogPosts.slug, dto.slug), (0, drizzle_orm_1.sql) `${schema_1.blogPosts.id} <> ${id}`))
                .execute();
            if (slugTaken.length)
                throw new common_1.BadRequestException('Slug already exists');
        }
        return this.db.transaction(async (tx) => {
            const [updated] = await tx
                .update(schema_1.blogPosts)
                .set({
                title: dto.title,
                slug: dto.slug,
                excerpt: dto.excerpt,
                coverImageUrl: dto.coverImageUrl,
                content: dto.content,
                isFeatured: dto.isFeatured,
                seoTitle: dto.seoTitle,
                seoDescription: dto.seoDescription,
                focusKeyword: dto.focusKeyword,
                status: dto.status,
                updatedAt: new Date(),
            })
                .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.id, id))
                .returning()
                .execute();
            if (dto.products) {
                const ids = dto.products.map((p) => p.productId);
                if (ids.length) {
                    const found = await tx
                        .select({ id: schema_1.products.id })
                        .from(schema_1.products)
                        .where((0, drizzle_orm_1.inArray)(schema_1.products.id, ids))
                        .execute();
                    const foundSet = new Set(found.map((r) => r.id));
                    const missing = ids.filter((pid) => !foundSet.has(pid));
                    if (missing.length) {
                        throw new common_1.BadRequestException(`Some products not found: ${missing.join(', ')}`);
                    }
                }
                await tx
                    .delete(schema_1.blogPostProducts)
                    .where((0, drizzle_orm_1.eq)(schema_1.blogPostProducts.postId, id))
                    .execute();
                if (ids.length) {
                    await tx
                        .insert(schema_1.blogPostProducts)
                        .values(dto.products.map((p) => ({
                        postId: id,
                        productId: p.productId,
                        sortOrder: p.sortOrder ?? 0,
                    })))
                        .onConflictDoNothing()
                        .execute();
                }
            }
            await this.auditService.logAction({
                action: 'update',
                entity: 'blog_post',
                entityId: id,
                userId: user.id,
                details: 'Updated blog post',
                ipAddress: ip,
                changes: { ...dto },
            });
            await this.cache.bumpCompanyVersion(user.companyId);
            return updated;
        });
    }
    async publish(user, id, ip) {
        const [updated] = await this.db
            .update(schema_1.blogPosts)
            .set({
            status: create_blog_post_dto_1.BlogPostStatus.PUBLISHED,
            publishedAt: new Date(),
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.id, id))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Blog post not found');
        await this.auditService.logAction({
            action: 'update',
            entity: 'blog_post',
            entityId: id,
            userId: user.id,
            details: 'Published blog post',
            ipAddress: ip,
            changes: { status: create_blog_post_dto_1.BlogPostStatus.PUBLISHED },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return updated;
    }
    async unpublish(user, id, ip) {
        const [updated] = await this.db
            .update(schema_1.blogPosts)
            .set({
            status: create_blog_post_dto_1.BlogPostStatus.DRAFT,
            publishedAt: null,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.id, id))
            .returning()
            .execute();
        if (!updated)
            throw new common_1.NotFoundException('Blog post not found');
        await this.auditService.logAction({
            action: 'update',
            entity: 'blog_post',
            entityId: id,
            userId: user.id,
            details: 'Unpublished blog post',
            ipAddress: ip,
            changes: { status: create_blog_post_dto_1.BlogPostStatus.DRAFT },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return updated;
    }
    async remove(user, id, ip) {
        const [deleted] = await this.db
            .delete(schema_1.blogPosts)
            .where((0, drizzle_orm_1.eq)(schema_1.blogPosts.id, id))
            .returning()
            .execute();
        if (!deleted)
            throw new common_1.NotFoundException('Blog post not found');
        await this.auditService.logAction({
            action: 'delete',
            entity: 'blog_post',
            entityId: id,
            userId: user.id,
            details: 'Deleted blog post',
            ipAddress: ip,
            changes: { slug: deleted.slug },
        });
        await this.cache.bumpCompanyVersion(user.companyId);
        return { message: 'Deleted' };
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService,
        audit_service_1.AuditService,
        aws_service_1.AwsService])
], BlogService);
//# sourceMappingURL=blog.service.js.map