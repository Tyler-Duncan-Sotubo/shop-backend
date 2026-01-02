// src/modules/blog/blog-posts.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, SQL, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { blogPosts, blogPostProducts, products } from 'src/drizzle/schema';
import { CreateBlogPostDto, BlogPostStatus } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { AwsService } from 'src/common/aws/aws.service';
import { BlogPostsAdminQueryDto } from './dto/blog-posts-admin-query.dto';

@Injectable()
export class BlogService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly aws: AwsService,
  ) {}

  // -----------------------------
  // Create
  // -----------------------------
  async create(user: User, dto: CreateBlogPostDto, ip: string) {
    // slug uniqueness
    const existing = await this.db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.slug, dto.slug))
      .execute();

    if (existing.length > 0) {
      throw new BadRequestException('Slug already exists');
    }

    const now = new Date();
    const status = dto.status ?? BlogPostStatus.DRAFT;

    return this.db.transaction(async (tx) => {
      // 1) create post first (so we have an id for filename)
      const [post] = await tx
        .insert(blogPosts)
        .values({
          storeId: dto.storeId,
          title: dto.title,
          slug: dto.slug,
          excerpt: dto.excerpt,
          coverImageUrl: dto.coverImageUrl ?? null, // may be replaced after upload
          content: dto.content,
          status,
          publishedAt: status === BlogPostStatus.PUBLISHED ? now : null,
          isFeatured: dto.isFeatured ?? false,
          seoTitle: dto.seoTitle ?? null,
          seoDescription: dto.seoDescription ?? null,
          focusKeyword: dto.focusKeyword ?? null,
        })
        .returning()
        .execute();

      // 2) upload cover image if provided (base64) and update coverImageUrl
      if (dto.base64CoverImage) {
        const fileName = `${post.id}-cover-${Date.now()}.jpg`;
        const url = await this.aws.uploadImageToS3(
          user.companyId,
          fileName,
          dto.base64CoverImage,
        );

        await tx
          .update(blogPosts)
          .set({ coverImageUrl: url, updatedAt: new Date() })
          .where(eq(blogPosts.id, post.id))
          .execute();

        // reflect new url in returned object
        (post as any).coverImageUrl = url;
      }

      // 3) link products (same as you already have)
      if (dto.products?.length) {
        const ids = dto.products.map((p) => p.productId);

        const found = await tx
          .select({ id: products.id })
          .from(products)
          .where(inArray(products.id, ids))
          .execute();

        const foundSet = new Set(found.map((r) => r.id));
        const missing = ids.filter((id) => !foundSet.has(id));
        if (missing.length) {
          throw new BadRequestException(
            `Some products not found: ${missing.join(', ')}`,
          );
        }

        await tx
          .insert(blogPostProducts)
          .values(
            dto.products.map((p) => ({
              postId: post.id,
              productId: p.productId,
              sortOrder: p.sortOrder ?? 0,
            })),
          )
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

  // -----------------------------
  // List (admin)
  // -----------------------------

  async listAdmin(user: User, filters: BlogPostsAdminQueryDto = {}) {
    return this.cache.getOrSetVersioned(
      user.companyId,
      [
        'blog',
        'posts',
        filters.status ?? 'all',
        filters.storeId ?? 'all',
        filters.search ?? 'all',
        filters.limit?.toString() ?? 'default',
        filters.offset?.toString() ?? '0',
      ],
      async () => {
        const { status, storeId, search, limit = 50, offset = 0 } = filters;

        const conditions: SQL[] = [];

        if (status) {
          conditions.push(eq(blogPosts.status, status));
        }

        if (storeId) {
          conditions.push(eq(blogPosts.storeId, storeId));
        }

        if (search) {
          conditions.push(sql`${blogPosts.title} ILIKE ${'%' + search + '%'}`);
        }

        const whereClause = conditions.length ? and(...conditions) : undefined;

        // 1️⃣ total count
        const [{ count }] = await this.db
          .select({
            count: sql<number>`count(*)`,
          })
          .from(blogPosts)
          .where(whereClause)
          .execute();

        // 2️⃣ paginated rows
        const rows = await this.db
          .select()
          .from(blogPosts)
          .where(whereClause)
          .orderBy(desc(blogPosts.createdAt))
          .limit(limit)
          .offset(offset)
          .execute();

        return {
          rows,
          count: Number(count),
        };
      },
    );
  }

  // -----------------------------
  // Get (admin)
  // -----------------------------
  async getByIdAdmin(user: User, id: string) {
    return this.cache.getOrSetVersioned(
      user.companyId,
      ['blog', 'post', id],
      async () => {
        const post = await this.db.query.blogPosts.findFirst({
          where: eq(blogPosts.id, id),
          with: {
            products: {
              with: {
                product: true,
              },
            },
          },
        });

        if (!post) throw new NotFoundException('Blog post not found');
        return post;
      },
    );
  }

  // -----------------------------
  // Public list + get by slug (optional)
  // -----------------------------
  async listPublic(storeId: string, opts?: { page?: number; limit?: number }) {
    const page = Math.max(1, opts?.page ?? 1);
    const limit = Math.min(50, opts?.limit ?? 10); // cap for safety
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(blogPosts.storeId, storeId),
      eq(blogPosts.status, BlogPostStatus.PUBLISHED),
      sql`${blogPosts.publishedAt} IS NOT NULL`,
      sql`${blogPosts.publishedAt} <= now()`,
    );

    // total count
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(whereClause)
      .execute();

    // paginated items
    const items = await this.db
      .select()
      .from(blogPosts)
      .where(whereClause)
      .orderBy(desc(blogPosts.publishedAt))
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

  async getBySlugPublic(storeId: string, slug: string) {
    const post = await this.db.query.blogPosts.findFirst({
      where: and(
        eq(blogPosts.storeId, storeId),
        eq(blogPosts.slug, slug),
        eq(blogPosts.status, BlogPostStatus.PUBLISHED),
        sql`${blogPosts.publishedAt} IS NOT NULL`,
        sql`${blogPosts.publishedAt} <= now()`,
      ),
      with: {
        products: {
          with: { product: true },
        },
      },
    });

    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  // -----------------------------
  // Update
  // -----------------------------
  async update(user: User, id: string, dto: UpdateBlogPostDto, ip: string) {
    const existing = await this.db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.id, id))
      .execute();

    if (existing.length === 0)
      throw new NotFoundException('Blog post not found');

    // slug uniqueness if changed
    if (dto.slug) {
      const slugTaken = await this.db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, dto.slug), sql`${blogPosts.id} <> ${id}`))
        .execute();

      if (slugTaken.length)
        throw new BadRequestException('Slug already exists');
    }

    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(blogPosts)
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
          // status/published handled by publish/unpublish endpoints ideally;
          // but allow if you want:
          status: dto.status,
          updatedAt: new Date(),
        })
        .where(eq(blogPosts.id, id))
        .returning()
        .execute();

      // Replace product links if provided
      if (dto.products) {
        const ids = dto.products.map((p) => p.productId);
        if (ids.length) {
          const found = await tx
            .select({ id: products.id })
            .from(products)
            .where(inArray(products.id, ids))
            .execute();

          const foundSet = new Set(found.map((r) => r.id));
          const missing = ids.filter((pid) => !foundSet.has(pid));
          if (missing.length) {
            throw new BadRequestException(
              `Some products not found: ${missing.join(', ')}`,
            );
          }
        }

        await tx
          .delete(blogPostProducts)
          .where(eq(blogPostProducts.postId, id))
          .execute();

        if (ids.length) {
          await tx
            .insert(blogPostProducts)
            .values(
              dto.products.map((p) => ({
                postId: id,
                productId: p.productId,
                sortOrder: p.sortOrder ?? 0,
              })),
            )
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

  // -----------------------------
  // Publish / Unpublish
  // -----------------------------
  async publish(user: User, id: string, ip: string) {
    const [updated] = await this.db
      .update(blogPosts)
      .set({
        status: BlogPostStatus.PUBLISHED,
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Blog post not found');

    await this.auditService.logAction({
      action: 'update',
      entity: 'blog_post',
      entityId: id,
      userId: user.id,
      details: 'Published blog post',
      ipAddress: ip,
      changes: { status: BlogPostStatus.PUBLISHED },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return updated;
  }

  async unpublish(user: User, id: string, ip: string) {
    const [updated] = await this.db
      .update(blogPosts)
      .set({
        status: BlogPostStatus.DRAFT,
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(blogPosts.id, id))
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Blog post not found');

    await this.auditService.logAction({
      action: 'update',
      entity: 'blog_post',
      entityId: id,
      userId: user.id,
      details: 'Unpublished blog post',
      ipAddress: ip,
      changes: { status: BlogPostStatus.DRAFT },
    });

    await this.cache.bumpCompanyVersion(user.companyId);
    return updated;
  }

  // -----------------------------
  // Delete (optional)
  // -----------------------------
  async remove(user: User, id: string, ip: string) {
    const [deleted] = await this.db
      .delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .returning()
      .execute();

    if (!deleted) throw new NotFoundException('Blog post not found');

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
}
