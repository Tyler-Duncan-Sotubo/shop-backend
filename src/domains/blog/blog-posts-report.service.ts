import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  blogPosts,
  blogPostProducts,
  products,
} from 'src/infrastructure/drizzle/schema';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { ExportUtil } from 'src/infrastructure/exports/export.util';

type ExportColumn = { field: string; title: string };

@Injectable()
export class BlogPostsReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly aws: AwsService,
  ) {}

  private todayString(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  private async exportAndUpload(
    rows: any[],
    columns: ExportColumn[],
    filenameBase: string,
    companyId: string,
    folder: string,
    format: 'csv' | 'excel',
  ) {
    if (!rows.length) {
      throw new BadRequestException(`No data available for ${filenameBase}`);
    }

    const filePath =
      format === 'excel'
        ? await ExportUtil.exportToExcel(rows, columns, filenameBase)
        : ExportUtil.exportToCSV(rows, columns, filenameBase);

    // IMPORTANT: this assumes you fixed AwsService.uploadFilePath signature:
    // uploadFilePath(filePath, companyId, 'report', folder)
    return this.aws.uploadFilePath(filePath, companyId, 'report', folder);
  }

  async exportBlogPostsToS3(
    companyId: string,
    opts?: {
      storeId?: string;
      status?: string; // 'draft' | 'published' | etc
      search?: string;
      format?: 'csv' | 'excel';

      includeProducts?: boolean;
      includeSeo?: boolean;
      includeContent?: boolean; // big column
    },
  ) {
    const format = opts?.format ?? 'csv';

    const whereClauses: any[] = [];
    if (opts?.storeId) whereClauses.push(eq(blogPosts.storeId, opts.storeId));
    if (opts?.status)
      whereClauses.push(eq(blogPosts.status, opts.status as any));
    if (opts?.search)
      whereClauses.push(ilike(blogPosts.title, `%${opts.search}%`));

    const base = await this.db
      .select({
        id: blogPosts.id,
        storeId: blogPosts.storeId,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        coverImageUrl: blogPosts.coverImageUrl,
        status: blogPosts.status,
        publishedAt: blogPosts.publishedAt,
        isFeatured: blogPosts.isFeatured,

        seoTitle: blogPosts.seoTitle,
        seoDescription: blogPosts.seoDescription,
        focusKeyword: blogPosts.focusKeyword,

        content: blogPosts.content,
      })
      .from(blogPosts)
      .where(whereClauses.length ? and(...whereClauses) : undefined)
      .orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt))
      .execute();

    if (!base.length) return null;

    const postIds = base.map((p) => p.id);

    // Optional: pull product links (flattened)
    const productsByPost = new Map<string, string[]>();
    if (opts?.includeProducts) {
      const links = await this.db
        .select({
          postId: blogPostProducts.postId,
          productName: products.name,
        })
        .from(blogPostProducts)
        .innerJoin(products, eq(products.id, blogPostProducts.productId))
        .where(inArray(blogPostProducts.postId, postIds))
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

        // optional columns
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

    const columns: ExportColumn[] = [
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
      columns.push(
        { field: 'seo_title', title: 'SEO Title' },
        { field: 'seo_description', title: 'SEO Description' },
        { field: 'focus_keyword', title: 'Focus Keyword' },
      );
    }

    if (opts?.includeContent) {
      columns.push({ field: 'content', title: 'Content (HTML)' });
    }

    const storePart = opts?.storeId ? `store_${opts.storeId}` : 'allstores';
    const statusPart = opts?.status ?? 'allstatus';
    const filename = `blog_posts_${companyId}_${storePart}_${statusPart}_${this.todayString()}`;

    return this.exportAndUpload(
      rows,
      columns,
      filename,
      companyId,
      'blog-posts',
      format,
    );
  }
}
