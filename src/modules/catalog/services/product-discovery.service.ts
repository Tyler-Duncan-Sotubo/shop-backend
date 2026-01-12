// src/modules/catalog/product-discovery.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import {
  products,
  productImages,
  productVariants,
  productReviews,
  productCategories,
  categories,
} from 'src/drizzle/schema';
import { orders } from 'src/drizzle/schema'; // or wherever you export it
import { orderItems } from 'src/drizzle/schema'; // or wherever you export it

/**
 * Matches what your `mapProductsListToStorefront()` expects.
 */
export type ProductListRowStoreFront = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;

  minPrice: number | null;
  maxPrice: number | null;
  minSalePrice: number | null;
  maxSalePrice: number | null;

  ratingCount: number;
  averageRating: number;

  categories?: { id: string; name: string }[];
};

type DiscoveryOpts = {
  limit?: number;
  offset?: number;
  search?: string;
};

@Injectable()
export class ProductDiscoveryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // ---------------------------------------------------------------------------
  // LATEST
  // ---------------------------------------------------------------------------
  async listLatestStorefrontProducts(
    companyId: string,
    storeId: string,
    opts?: DiscoveryOpts,
  ): Promise<ProductListRowStoreFront[]> {
    const limit = opts?.limit ?? 12;
    const offset = opts?.offset ?? 0;
    const search = opts?.search?.trim() || null;

    const cacheKey = [
      'catalog',
      'discovery',
      'latest',
      storeId,
      JSON.stringify({ limit, offset, search }),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const where = [
        eq(products.companyId, companyId),
        eq(products.storeId, storeId),
        eq(products.status, 'active'),
        isNull(products.deletedAt),
      ] as any[];

      if (search) where.push(sql`${products.name} ILIKE ${`%${search}%`}`);

      const idRows = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(...where))
        .orderBy(sql`${products.createdAt} DESC`)
        .limit(limit)
        .offset(offset)
        .execute();

      return this.hydrateStorefrontRows(
        companyId,
        storeId,
        idRows.map((r) => r.id),
      );
    });
  }

  // ---------------------------------------------------------------------------
  // ON SALE
  // ---------------------------------------------------------------------------
  async listOnSaleStorefrontProducts(
    companyId: string,
    storeId: string,
    opts?: DiscoveryOpts,
  ): Promise<ProductListRowStoreFront[]> {
    const limit = opts?.limit ?? 12;
    const offset = opts?.offset ?? 0;
    const search = opts?.search?.trim() || null;

    const cacheKey = [
      'catalog',
      'discovery',
      'onSale',
      storeId,
      JSON.stringify({ limit, offset, search }),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const where = [
        eq(products.companyId, companyId),
        eq(products.storeId, storeId),
        eq(products.status, 'active'),
        isNull(products.deletedAt),

        // ✅ at least one active variant that is truly on sale
        sql`EXISTS (
          SELECT 1
          FROM ${productVariants} v
          WHERE v.company_id = ${companyId}
            AND v.product_id = ${products.id}
            AND v.deleted_at IS NULL
            AND v.is_active = true
            AND v.sale_price > 0
            AND v.regular_price > 0
            AND v.sale_price < v.regular_price
        )`,
      ] as any[];

      if (search) where.push(sql`${products.name} ILIKE ${`%${search}%`}`);

      const idRows = await this.db
        .select({ id: products.id })
        .from(products)
        .where(and(...where))
        .orderBy(sql`${products.createdAt} DESC`)
        .limit(limit)
        .offset(offset)
        .execute();

      return this.hydrateStorefrontRows(
        companyId,
        storeId,
        idRows.map((r) => r.id),
      );
    });
  }

  // ---------------------------------------------------------------------------
  // BEST SELLERS (paid orders only, last N days)
  // - counts units sold from order_items.quantity
  // - uses order_items.product_id when present
  // - falls back to variant->product lookup when product_id is null
  // ---------------------------------------------------------------------------
  async listBestSellerStorefrontProducts(
    companyId: string,
    storeId: string,
    opts?: {
      limit?: number;
      offset?: number;
      windowDays?: number; // default 30
    },
  ): Promise<ProductListRowStoreFront[]> {
    const limit = opts?.limit ?? 12;
    const offset = opts?.offset ?? 0;
    const windowDays = opts?.windowDays ?? 30;

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const cacheKey = [
      'catalog',
      'discovery',
      'bestSellers',
      storeId,
      JSON.stringify({ limit, offset, windowDays }),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      /**
       * We use:
       * - orders.paidAt IS NOT NULL (strong signal of payment)
       * - orders.createdAt >= since
       * - order_items.companyId matches companyId
       *
       * And coalesce product id from:
       *   COALESCE(order_items.product_id, product_variants.product_id)
       */
      const productIdExpr = sql<string>`COALESCE(${orderItems.productId}, ${productVariants.productId})`;

      const rows = await this.db
        .select({
          productId: productIdExpr,
          units: sql<number>`SUM(${orderItems.quantity})`,
        })
        .from(orderItems)
        .innerJoin(
          orders,
          and(
            eq(orders.id, orderItems.orderId),
            eq(orders.companyId, companyId),
            eq(orders.storeId, storeId),
            sql`${orders.paidAt} IS NOT NULL`,
            sql`${orders.createdAt} >= ${since}`,
          ),
        )
        .leftJoin(
          productVariants,
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.id, orderItems.variantId),
            isNull(productVariants.deletedAt),
          ),
        )
        .where(
          and(
            eq(orderItems.companyId, companyId),
            // ignore rows where we can't resolve a product id
            sql`${productIdExpr} IS NOT NULL`,
          ),
        )
        .groupBy(productIdExpr)
        .orderBy(sql`SUM(${orderItems.quantity}) DESC`)
        .limit(limit)
        .offset(offset)
        .execute();

      const productIds = rows
        .map((r) => r.productId)
        .filter(Boolean) as string[];

      return this.hydrateStorefrontRows(companyId, storeId, productIds);
    });
  }

  // ---------------------------------------------------------------------------
  // HYDRATION (returns ProductListRowStoreFront in the SAME ORDER as productIds)
  // ---------------------------------------------------------------------------
  private async hydrateStorefrontRows(
    companyId: string,
    storeId: string,
    productIds: string[],
  ): Promise<ProductListRowStoreFront[]> {
    if (!productIds.length) return [];

    // 1) Base product info + default image
    const baseRows = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        imageUrl: productImages.url,
      })
      .from(products)
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, products.companyId),
          eq(productImages.id, products.defaultImageId),
          isNull(productImages.deletedAt),
        ),
      )
      .where(
        and(
          eq(products.companyId, companyId),
          eq(products.storeId, storeId),
          inArray(products.id, productIds),
          eq(products.status, 'active'),
          isNull(products.deletedAt),
        ),
      )
      .execute();

    const baseById = new Map(baseRows.map((r) => [r.id, r]));

    // 2) Price aggregates (regular min/max + sale min/max)
    const priceRows = await this.db
      .select({
        productId: productVariants.productId,

        minPrice: sql<
          string | null
        >`MIN(NULLIF(${productVariants.regularPrice}, 0))`,
        maxPrice: sql<
          string | null
        >`MAX(NULLIF(${productVariants.regularPrice}, 0))`,

        minSalePrice: sql<string | null>`
          MIN(
            CASE
              WHEN NULLIF(${productVariants.salePrice}, 0) IS NOT NULL
               AND NULLIF(${productVariants.regularPrice}, 0) IS NOT NULL
               AND ${productVariants.salePrice} < ${productVariants.regularPrice}
              THEN ${productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
        maxSalePrice: sql<string | null>`
          MAX(
            CASE
              WHEN NULLIF(${productVariants.salePrice}, 0) IS NOT NULL
               AND NULLIF(${productVariants.regularPrice}, 0) IS NOT NULL
               AND ${productVariants.salePrice} < ${productVariants.regularPrice}
              THEN ${productVariants.salePrice}
              ELSE NULL
            END
          )
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

    const priceByProductId = new Map<
      string,
      {
        minPrice: number | null;
        maxPrice: number | null;
        minSalePrice: number | null;
        maxSalePrice: number | null;
      }
    >();

    for (const r of priceRows) {
      priceByProductId.set(r.productId, {
        minPrice: r.minPrice == null ? null : Number(r.minPrice),
        maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
        minSalePrice: r.minSalePrice == null ? null : Number(r.minSalePrice),
        maxSalePrice: r.maxSalePrice == null ? null : Number(r.maxSalePrice),
      });
    }

    // 3) Ratings aggregates (approved)
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

    const ratingsByProductId = new Map<
      string,
      { ratingCount: number; averageRating: number }
    >();
    for (const r of ratingRows) {
      ratingsByProductId.set(r.productId, {
        ratingCount: Number(r.ratingCount ?? 0),
        averageRating: Number(r.averageRating ?? 0),
      });
    }

    // 4) Categories (for tags)
    const catRows = await this.db
      .select({
        productId: productCategories.productId,
        categoryId: categories.id,
        categoryName: categories.name,
      })
      .from(productCategories)
      .innerJoin(
        categories,
        and(
          eq(categories.companyId, productCategories.companyId),
          eq(categories.id, productCategories.categoryId),
          isNull(categories.deletedAt),
        ),
      )
      .where(
        and(
          eq(productCategories.companyId, companyId),
          inArray(productCategories.productId, productIds),
        ),
      )
      .execute();

    const catsByProductId = new Map<string, { id: string; name: string }[]>();
    for (const r of catRows) {
      const list = catsByProductId.get(r.productId) ?? [];
      list.push({ id: r.categoryId, name: r.categoryName });
      catsByProductId.set(r.productId, list);
    }

    // 5) Return in requested order
    const out: ProductListRowStoreFront[] = [];
    for (const id of productIds) {
      const base = baseById.get(id);
      if (!base) continue;

      const price = priceByProductId.get(id) ?? {
        minPrice: null,
        maxPrice: null,
        minSalePrice: null,
        maxSalePrice: null,
      };

      const rating = ratingsByProductId.get(id) ?? {
        ratingCount: 0,
        averageRating: 0,
      };

      out.push({
        id: base.id,
        name: base.name,
        slug: base.slug,
        imageUrl: base.imageUrl ?? null,

        minPrice: price.minPrice,
        maxPrice: price.maxPrice,
        minSalePrice: price.minSalePrice,
        maxSalePrice: price.maxSalePrice,

        ratingCount: rating.ratingCount,
        averageRating: rating.averageRating,

        categories: catsByProductId.get(id) ?? [],
      });
    }

    return out;
  }
}
