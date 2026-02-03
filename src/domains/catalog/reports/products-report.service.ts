// src/modules/reports/products-report.service.ts

import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';

import {
  products,
  productVariants,
  productImages,
  productCategories,
  categories,
  productReviews,
} from 'src/infrastructure/drizzle/schema';
import { AwsService } from 'src/infrastructure/aws/aws.service'; // must have uploadFilePath
import { toCdnUrl } from 'src/infrastructure/cdn/to-cdn-url';
import { ExportUtil } from 'src/infrastructure/exports/export.util';

type ExportColumn = { field: string; title: string };

@Injectable()
export class ProductsReportService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly aws: AwsService,
  ) {}

  // ----------------- helpers -----------------

  private todayString(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  private buildPermalink(slug: string) {
    return `/products/${slug}`;
  }

  private async exportAndUpload<T>(
    rows: T[],
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
        ? await ExportUtil.exportToExcel(rows as any[], columns, filenameBase)
        : ExportUtil.exportToCSV(rows as any[], columns, filenameBase);

    return this.aws.uploadFilePath(filePath, companyId, 'report', 'products');
  }

  /**
   * Export products (storefront-shaped fields + metadata fields)
   */
  async exportProductsToS3(
    companyId: string,
    opts?: {
      storeId?: string;
      status?: string; // 'active' | 'draft' | 'archived'
      format?: 'csv' | 'excel';
      includeMetaJson?: boolean;
    },
  ) {
    const format = opts?.format ?? 'csv';

    const whereClauses: any[] = [
      eq(products.companyId, companyId),
      opts?.status === 'archived'
        ? sql`${products.deletedAt} IS NOT NULL`
        : sql`${products.deletedAt} IS NULL`,
    ];

    if (opts?.storeId) whereClauses.push(eq(products.storeId, opts.storeId));
    if (opts?.status && opts.status !== 'archived') {
      whereClauses.push(
        eq(products.status, opts.status as 'draft' | 'active' | 'archived'),
      );
    }

    // 1) base products (+ default image url)
    const base = await this.db
      .select({
        id: products.id, // keep internally for joins
        name: products.name,
        slug: products.slug,
        status: products.status,
        productType: products.productType,
        metadata: products.metadata,
        defaultImageUrl: productImages.url,
      })
      .from(products)
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, products.companyId),
          eq(productImages.id, products.defaultImageId),
        ),
      )
      .where(and(...whereClauses))
      .orderBy(sql`${products.createdAt} DESC`)
      .execute();

    if (!base.length) return null;

    const productIds = base.map((p) => p.id);

    // 2) pricing aggregates
    const priceRows = await this.db
      .select({
        productId: productVariants.productId,
        minRegular: sql<
          string | null
        >`MIN(NULLIF(${productVariants.regularPrice}, 0))`,
        maxRegular: sql<
          string | null
        >`MAX(NULLIF(${productVariants.regularPrice}, 0))`,
        minSale: sql<string | null>`
        MIN(
          CASE
            WHEN ${productVariants.salePrice} > 0
             AND ${productVariants.salePrice} < ${productVariants.regularPrice}
            THEN ${productVariants.salePrice}
            ELSE NULL
          END
        )
      `,
        onSale: sql<number>`
        CASE
          WHEN SUM(
            CASE
              WHEN ${productVariants.salePrice} > 0
               AND ${productVariants.salePrice} < ${productVariants.regularPrice}
              THEN 1 ELSE 0
            END
          ) > 0 THEN 1 ELSE 0
        END
      `,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.companyId, companyId),
          inArray(productVariants.productId, productIds),
          isNull(productVariants.deletedAt),
          eq(productVariants.isActive, true),
        ),
      )
      .groupBy(productVariants.productId)
      .execute();

    const pricingByProduct = new Map<
      string,
      {
        minRegular: number;
        maxRegular: number;
        minSale: number | null;
        onSale: boolean;
      }
    >();

    for (const r of priceRows) {
      const minRegular = Number(r.minRegular ?? 0);
      const maxRegular = Number(r.maxRegular ?? r.minRegular ?? 0);
      const minSale = r.minSale == null ? null : Number(r.minSale);

      pricingByProduct.set(r.productId, {
        minRegular,
        maxRegular,
        minSale,
        onSale: Number(r.onSale ?? 0) === 1,
      });
    }

    // 3) ratings aggregates
    const ratingRows = await this.db
      .select({
        productId: productReviews.productId,
        ratingCount: sql<number>`COUNT(*)`,
        averageRating: sql<number>`
        COALESCE(ROUND(AVG(${productReviews.rating})::numeric, 2), 0)
      `,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.companyId, companyId),
          inArray(productReviews.productId, productIds),
          eq(productReviews.isApproved, true),
          sql`${productReviews.deletedAt} IS NULL`,
        ),
      )
      .groupBy(productReviews.productId)
      .execute();

    const ratingsByProduct = new Map<
      string,
      { rating_count: number; average_rating: number }
    >();

    for (const r of ratingRows) {
      ratingsByProduct.set(r.productId, {
        rating_count: Number(r.ratingCount ?? 0),
        average_rating: Number(r.averageRating ?? 0),
      });
    }

    // 4) categories (names only)
    const catRows = await this.db
      .select({
        productId: productCategories.productId,
        categoryName: categories.name,
      })
      .from(productCategories)
      .innerJoin(
        categories,
        and(
          eq(categories.companyId, productCategories.companyId),
          eq(categories.id, productCategories.categoryId),
        ),
      )
      .where(
        and(
          eq(productCategories.companyId, companyId),
          inArray(productCategories.productId, productIds),
        ),
      )
      .execute();

    const catNamesByProduct = new Map<string, string[]>();
    for (const r of catRows) {
      catNamesByProduct.set(r.productId, [
        ...(catNamesByProduct.get(r.productId) ?? []),
        r.categoryName,
      ]);
    }

    // 5) images (all urls)
    const imageRows = await this.db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        position: productImages.position,
      })
      .from(productImages)
      .where(
        and(
          eq(productImages.companyId, companyId),
          inArray(productImages.productId, productIds),
          isNull(productImages.deletedAt),
        ),
      )
      .orderBy(productImages.productId, productImages.position)
      .execute();

    const imageUrlsByProduct = new Map<string, string[]>();
    for (const r of imageRows) {
      const list = imageUrlsByProduct.get(r.productId) ?? [];
      list.push(r.url ? toCdnUrl(r.url) : '');
      imageUrlsByProduct.set(r.productId, list.filter(Boolean));
    }

    const priceHtml = (
      minRegular: number,
      maxRegular: number,
      minSale: number | null,
      onSale: boolean,
    ) => {
      const range = (a: number, b: number) =>
        a === b ? `${a}` : `${a} - ${b}`;
      if (!minRegular) return '';
      if (!onSale || !minSale || minSale <= 0 || minSale >= minRegular) {
        return range(minRegular, maxRegular || minRegular);
      }
      return `<del>${range(minRegular, maxRegular || minRegular)}</del> <ins>${range(minSale, minSale)}</ins>`;
    };

    // 6) rows
    const rows = base.map((p) => {
      const pricing = pricingByProduct.get(p.id) ?? {
        minRegular: 0,
        maxRegular: 0,
        minSale: null,
        onSale: false,
      };

      const minEffective =
        pricing.onSale && pricing.minSale && pricing.minSale > 0
          ? pricing.minSale
          : pricing.minRegular;

      const ratings = ratingsByProduct.get(p.id) ?? {
        rating_count: 0,
        average_rating: 0,
      };

      const meta = (p.metadata ?? {}) as Record<string, any>;

      return {
        name: p.name,
        slug: p.slug,
        permalink: this.buildPermalink(p.slug),
        type: p.productType ?? 'simple',
        status: p.status,

        price: String(minEffective ?? 0),
        regular_price: String(pricing.minRegular ?? 0),
        sale_price:
          pricing.onSale && pricing.minSale ? String(pricing.minSale) : '',
        on_sale: pricing.onSale ? 'true' : 'false',
        price_html: priceHtml(
          pricing.minRegular,
          pricing.maxRegular,
          pricing.minSale,
          pricing.onSale,
        ),

        average_rating: Number(ratings.average_rating ?? 0).toFixed(2),
        rating_count: Number(ratings.rating_count ?? 0),

        default_image_url: p.defaultImageUrl ? toCdnUrl(p.defaultImageUrl) : '',
        image_urls: (imageUrlsByProduct.get(p.id) ?? []).join(', '),

        category_names: (catNamesByProduct.get(p.id) ?? []).join(', '),

        meta_details: meta.details ?? '',
        meta_why_you_will_love_it: meta.why_you_will_love_it ?? '',

        meta_json: opts?.includeMetaJson ? JSON.stringify(meta) : '',
      };
    });

    // 7) columns (cleaned)
    const columns: ExportColumn[] = [
      { field: 'name', title: 'Name' },
      { field: 'slug', title: 'Slug' },
      { field: 'permalink', title: 'Permalink' },
      { field: 'type', title: 'Type' },
      { field: 'status', title: 'Status' },

      { field: 'price', title: 'Price' },
      { field: 'regular_price', title: 'Regular Price' },
      { field: 'sale_price', title: 'Sale Price' },
      { field: 'on_sale', title: 'On Sale' },
      { field: 'price_html', title: 'Price HTML' },

      { field: 'average_rating', title: 'Average Rating' },
      { field: 'rating_count', title: 'Rating Count' },

      { field: 'default_image_url', title: 'Default Image URL' },
      { field: 'image_urls', title: 'All Image URLs' },

      { field: 'category_names', title: 'Category Names' },

      { field: 'meta_details', title: 'Meta: details (HTML)' },
      {
        field: 'meta_why_you_will_love_it',
        title: 'Meta: why_you_will_love_it',
      },
    ];

    if (opts?.includeMetaJson) {
      columns.push({ field: 'meta_json', title: 'Meta JSON' });
    }

    const storePart = opts?.storeId ? `store_${opts.storeId}` : 'allstores';
    const statusPart = opts?.status ?? 'allstatus';
    const filename = `products_${companyId}_${storePart}_${statusPart}_${this.todayString()}`;

    return this.exportAndUpload(
      rows,
      columns,
      filename,
      companyId,
      'products',
      format,
    );
  }
}
