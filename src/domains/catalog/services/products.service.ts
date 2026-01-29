// src/modules/catalog/products.service.ts
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  companies,
  products,
  productCategories,
  categories,
  productLinks,
  ProductLinkType,
  inventoryItems,
  productVariants,
  productImages,
  productReviews,
  productOptions,
  productOptionValues,
  media,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { slugify } from '../utils/slugify';
import {
  AssignProductCategoriesDto,
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from '../dtos/products';
import { CategoriesService } from './categories.service';
import { LinkedProductsService } from './linked-products.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import {
  buildDiscountAwarePriceHtml,
  mapProductToCollectionListResponse,
} from '../mappers/product.mapper';
import { ConfigService } from '@nestjs/config';
import { InventoryStockService } from 'src/domains/commerce/inventory/services/inventory-stock.service';

type CollectionCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  afterContentHtml: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  imageAltText: string | null;
};

type CollectionResponse<TProduct> = {
  category: CollectionCategory | null;
  products: TProduct[];
};

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly categoryService: CategoriesService,
    private readonly linkedProductsService: LinkedProductsService,
    private readonly aws: AwsService,
    private readonly configService: ConfigService,
    private readonly inventoryService: InventoryStockService,
  ) {}

  // ----------------- Helpers -----------------

  async assertCompanyExists(companyId: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async findProductByIdOrThrow(companyId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.companyId, companyId), eq(products.id, productId)),
      with: {
        // basic relations; you can extend this as needed
        variants: true,
        images: true,
        productCategories: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found for company ${companyId}`);
    }

    return product;
  }

  async ensureSlugUnique(companyId: string, slug: string, excludeId?: string) {
    const existing = await this.db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.companyId, companyId), eq(products.slug, slug)))
      .execute();

    const conflict = existing.find((p) => p.id !== excludeId);

    if (conflict) {
      throw new ConflictException(`Slug "${slug}" already exists for company`);
    }
  }

  private sanitizeFileName(name?: string | null) {
    const raw = (name ?? '').trim();
    if (!raw) return null;

    return raw
      .replace(/[/\\]/g, '-') // prevent paths
      .replace(/\s+/g, '-') // spaces -> dashes
      .replace(/[^a-zA-Z0-9._-]/g, ''); // drop unsafe chars
  }

  private extractStorageKeyFromUrl(url?: string | null) {
    if (!url) return null;
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  // ----------------- Create -----------------
  private assertS3KeyAllowed(companyId: string, key: string) {
    // enforce a strict prefix so users can't attach random S3 objects
    // choose your convention; example:
    const prefix = `companies/${companyId}/products/`;
    if (!key.startsWith(prefix)) {
      throw new BadRequestException('Invalid image key');
    }
    if (key.includes('..')) {
      throw new BadRequestException('Invalid image key');
    }
  }

  private async createProductImageFromS3Key(opts: {
    tx: any;
    companyId: string;
    product: { id: string };
    image: {
      key: string; // tmp key or final key
      mimeType?: string;
      fileName?: string;
      altText?: string;
      position?: number;
    };
  }) {
    const { tx, companyId, product, image } = opts;

    this.assertS3KeyAllowed(companyId, image.key);

    // ensure object exists
    await this.aws.assertObjectExists(image.key);

    // move from tmp -> final (optional but recommended)
    // if you don't use tmp, you can skip moveObject and just keep image.key
    const isTmp = image.key.includes('/tmp/');
    const finalKey = isTmp
      ? `companies/${companyId}/products/${product.id}/${image.fileName ?? `img-${Date.now()}`}`
      : image.key;

    const moved = isTmp
      ? await this.aws.moveObject({
          fromKey: image.key,
          toKey: finalKey,
        })
      : {
          key: finalKey,
          url: `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${finalKey}`,
        };

    // Insert DB row
    const [row] = await tx
      .insert(productImages)
      .values({
        companyId,
        productId: product.id,
        variantId: null,
        fileName: image.fileName ?? null,
        mimeType: image.mimeType ?? null,
        // size/width/height can be filled later if you want
        url: moved.url,
        altText: image.altText ?? null,
        position: image.position ?? 1,
        storageKey: moved.key, // ✅ if you add this column
      })
      .returning({ id: productImages.id })
      .execute();

    return row;
  }

  //////////////////////////////////////////////////////
  // 4) Update createProduct(): accept keys/urls        //
  //////////////////////////////////////////////////////
  async createProduct(
    companyId: string,
    dto: CreateProductDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertCompanyExists(companyId);

    const slug = slugify(dto.slug ?? dto.name);
    await this.ensureSlugUnique(companyId, slug);

    const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
    const linksByType = dto.links ?? {};

    // ✅ Enforce max images based on productType
    const productType = dto.productType ?? 'simple';
    const maxImages = productType === 'variable' ? 1 : 9;

    if (dto.images?.length && dto.images.length > maxImages) {
      throw new BadRequestException(`Too many images. Max is ${maxImages}.`);
    }

    const safeDefaultIndex =
      productType === 'variable' ? 0 : (dto.defaultImageIndex ?? 0);

    // ✅ If simple product, ensure SKU uniqueness (if provided)
    // (Matches createVariant() behavior)
    if (productType === 'simple' && dto.sku?.trim()) {
      await this.ensureSkuUnique(companyId, dto.sku.trim());
    }

    // We’ll use this to decide if we need to sync the sales category after creation
    const shouldSyncSalesCategory =
      productType === 'simple' &&
      dto.salePrice != null &&
      String(dto.salePrice).trim() !== '';

    const created = await this.db.transaction(async (tx) => {
      // 1) Create product shell
      const [product] = await tx
        .insert(products)
        .values({
          companyId,
          storeId: dto.storeId,
          name: dto.name,
          description: dto.description ?? null,
          slug,
          status: dto.status ?? 'draft',
          productType,
          isGiftCard: dto.isGiftCard ?? false,
          seoTitle: dto.seoTitle ?? null,
          moq: dto.moq ?? 1,
          seoDescription: dto.seoDescription ?? null,
          metadata: dto.metadata ?? {},
        })
        .returning()
        .execute();

      let defaultImageId: string | null = null;

      // 2) Images (product-level images from S3 key)
      if (dto.images?.length) {
        const inserted: Array<{ id: string }> = [];

        for (let i = 0; i < dto.images.length; i++) {
          const image = dto.images[i];
          const position = image.position ?? i;

          const img = await this.createProductImageFromS3Key({
            tx,
            companyId,
            product,
            image: {
              key: image.key,
              mimeType: image.mimeType,
              fileName: image.fileName,
              altText: image.altText,
              position,
            },
          });

          inserted.push(img);
        }

        const chosen = inserted[safeDefaultIndex] ?? inserted[0];
        defaultImageId = chosen?.id ?? null;

        if (chosen) {
          await tx
            .update(products)
            .set({ defaultImageId: chosen.id, updatedAt: new Date() })
            .where(
              and(
                eq(products.companyId, companyId),
                eq(products.id, product.id),
              ),
            );
        }
      }

      // 3) Categories
      if (uniqueCategoryIds.length) {
        await this.categoryService.assertCategoriesBelongToCompany(
          companyId,
          uniqueCategoryIds,
        );

        await tx
          .insert(productCategories)
          .values(
            uniqueCategoryIds.map((categoryId) => ({
              companyId,
              productId: product.id,
              categoryId,
            })),
          )
          .execute();
      }

      // 4) Linked products
      const allLinkedIds: string[] = [];
      for (const ids of Object.values(linksByType)) {
        if (Array.isArray(ids)) allLinkedIds.push(...ids);
      }

      const uniqueAllLinkedIds = Array.from(
        new Set(allLinkedIds.filter((id) => id && id !== product.id)),
      );

      if (uniqueAllLinkedIds.length) {
        await this.linkedProductsService.assertProductsBelongToCompany(
          companyId,
          uniqueAllLinkedIds,
        );

        const rowsToInsert: (typeof productLinks.$inferInsert)[] = [];

        for (const [linkType, ids] of Object.entries(linksByType) as Array<
          [ProductLinkType, string[]]
        >) {
          if (!ids?.length) continue;

          const cleaned = Array.from(
            new Set(ids.filter((id) => id && id !== product.id)),
          );

          cleaned.forEach((linkedProductId, index) => {
            rowsToInsert.push({
              companyId,
              productId: product.id,
              linkedProductId,
              linkType,
              position: index + 1,
            });
          });
        }

        if (rowsToInsert.length) {
          await tx.insert(productLinks).values(rowsToInsert).execute();
        }
      }

      // 5) ✅ If SIMPLE: create default variant + inventory
      if (productType === 'simple') {
        // Variant metadata: keep it separate from product metadata
        const variantMetadata: Record<string, any> = {};
        if (dto.lowStockThreshold !== undefined) {
          // follow your existing convention used in updateVariant()
          variantMetadata.low_stock_threshold = dto.lowStockThreshold;
        }

        const [variant] = await tx
          .insert(productVariants)
          .values({
            companyId,
            productId: product.id,
            storeId: dto.storeId,
            imageId: defaultImageId,
            // Simple product default variant
            title: 'Default',
            sku: dto.sku?.trim() ? dto.sku.trim() : null,
            barcode: dto.barcode?.trim() ? dto.barcode.trim() : null,

            option1: null,
            option2: null,
            option3: null,

            isActive: true,

            // Pricing
            regularPrice: dto.regularPrice ?? '0',
            salePrice: dto.salePrice?.trim() ? dto.salePrice.trim() : null,
            currency: 'NGN',

            // Dimensions
            weight: dto.weight?.trim() ? dto.weight.trim() : null,
            length: dto.length?.trim() ? dto.length.trim() : null,
            width: dto.width?.trim() ? dto.width.trim() : null,
            height: dto.height?.trim() ? dto.height.trim() : null,

            metadata: variantMetadata,
          })
          .returning()
          .execute();

        // Inventory is managed via inventoryService in your system
        // Use the same semantics as updateVariant: stockQuantity + safetyStock
        const stockQty =
          dto.stockQuantity !== undefined &&
          String(dto.stockQuantity).trim() !== ''
            ? Number(dto.stockQuantity)
            : 0;

        const safetyStock =
          dto.lowStockThreshold !== undefined &&
          String(dto.lowStockThreshold).trim() !== ''
            ? Number(dto.lowStockThreshold)
            : 0;

        // If your inventory service expects numbers, this is fine.
        // If it expects strings, adjust accordingly.
        await this.inventoryService.setInventoryLevel(
          companyId,
          variant.id,
          stockQty,
          safetyStock,
          user,
          ip,
          { tx, skipCacheBump: true, skipAudit: true },
        );
      }

      return product;
    });

    // ✅ After TX: sync sales category if simple product was created with a sale price
    if (shouldSyncSalesCategory) {
      // we already have dto.storeId, no need to re-load product
      await this.categoryService.syncSalesCategoryForProduct({
        companyId,
        storeId: dto.storeId,
        productId: created.id,
      });
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'product',
        entityId: created.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created product',
        changes: {
          companyId,
          productId: created.id,
          name: created.name,
          status: created.status,
          productType,
          categoryIds: uniqueCategoryIds,
          links: dto.links ?? {},
          imagesCount: dto.images?.length ?? 0,
          defaultImageIndex: safeDefaultIndex,

          // ✅ Helpful for audits when simple products include pricing/inventory
          ...(productType === 'simple'
            ? {
                sku: dto.sku ?? null,
                regularPrice: dto.regularPrice ?? '0',
                salePrice: dto.salePrice ?? null,
                stockQuantity: dto.stockQuantity ?? null,
                lowStockThreshold: dto.lowStockThreshold ?? null,
              }
            : {}),
        },
      });
    }

    return created;
  }

  // ----------------- Read / Query -----------------

  // Admin panel
  async listProductsAdmin(companyId: string, query: ProductQueryDto) {
    const { search, status, storeId, limit = 50, offset = 0 } = query;

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'catalog',
        'products',
        'admin',
        JSON.stringify({
          storeId: storeId ?? null,
          search: search ?? null,
          status: status ?? null,
          limit,
          offset,
        }),
      ],
      async () => {
        const effectiveStatus = status ?? 'active';

        const whereClauses: any[] = [
          eq(products.companyId, companyId),
          eq(products.status, effectiveStatus),
        ];

        if (storeId) whereClauses.push(eq(products.storeId, storeId));

        if (status === 'archived')
          whereClauses.push(sql`${products.deletedAt} IS NOT NULL`);
        else whereClauses.push(sql`${products.deletedAt} IS NULL`);

        if (search) whereClauses.push(ilike(products.name, `%${search}%`));

        // ✅ count (no category joins)
        const [{ count: basicCount }] = await this.db
          .select({ count: sql<number>`count(distinct ${products.id})` })
          .from(products)
          .where(and(...whereClauses))
          .execute();

        const total = Number(basicCount) || 0;

        // ✅ items list must also receive storeId
        const items = await this.listProducts(
          companyId,
          storeId as string,
          query,
        );

        // ✅ add variantCount (1 grouped query)
        const productIds = items.map((p: any) => p.id).filter(Boolean);

        if (productIds.length === 0) {
          return { items, total, limit, offset };
        }

        const variantRows = await this.db
          .select({
            productId: productVariants.productId,
            variantCount: sql<number>`COUNT(*)`,
          })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.companyId, companyId),
              inArray(productVariants.productId, productIds),
              sql`${productVariants.deletedAt} IS NULL`, // remove if you don't soft-delete variants
            ),
          )
          .groupBy(productVariants.productId)
          .execute();

        const variantCountByProductId = new Map<string, number>();
        for (const r of variantRows) {
          variantCountByProductId.set(r.productId, Number(r.variantCount ?? 0));
        }

        const itemsWithVariantCount = items.map((p: any) => ({
          ...p,
          variantCount: variantCountByProductId.get(p.id) ?? 0,
        }));

        return { items: itemsWithVariantCount, total, limit, offset };
      },
    );
  }

  // store front
  async listProducts(
    companyId: string,
    storeId: string,
    query: ProductQueryDto,
  ) {
    const { search, status, categoryId, limit = 50, offset = 0 } = query;

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'catalog',
        'products',
        JSON.stringify({
          storeId: storeId ?? null,
          search: search ?? null,
          status: status ?? null,
          categoryId: categoryId ?? null,
          limit,
          offset,
        }),
      ],
      async () => {
        const effectiveStatus = status ?? 'active';

        const whereClauses: any[] = [
          eq(products.companyId, companyId),
          eq(products.status, effectiveStatus),
        ];

        if (storeId) whereClauses.push(eq(products.storeId, storeId));

        if (status === 'archived') {
          whereClauses.push(sql`${products.deletedAt} IS NOT NULL`);
        } else {
          whereClauses.push(sql`${products.deletedAt} IS NULL`);
        }

        if (search) whereClauses.push(ilike(products.name, `%${search}%`));

        // 1) Page products first
        let pageQuery = this.db
          .select({
            id: products.id,
            name: products.name,
            createdAt: products.createdAt,
            status: products.status,
            slug: products.slug,
            imageUrl: productImages.url,
          })
          .from(products)
          .leftJoin(
            productImages,
            and(
              eq(productImages.companyId, products.companyId),
              eq(productImages.id, products.defaultImageId),
            ),
          );

        if (categoryId) {
          pageQuery = pageQuery
            .innerJoin(
              productCategories,
              and(
                eq(productCategories.companyId, products.companyId),
                eq(productCategories.productId, products.id),
                eq(productCategories.categoryId, categoryId),
              ),
            )
            .innerJoin(
              categories,
              and(
                eq(categories.companyId, products.companyId),
                eq(categories.id, productCategories.categoryId),
              ),
            );
        }

        const page = await pageQuery
          .where(and(...whereClauses))
          .orderBy(sql`${products.createdAt} DESC`)
          .limit(limit)
          .offset(offset)
          .execute();

        if (page.length === 0) return [];

        const productIds = page.map((p) => p.id);

        // helper: create "min - max" labels
        const rangeLabel = (
          min: number | null,
          max: number | null,
        ): string | null => {
          if (min == null && max == null) return null;
          if (min != null && max != null)
            return min === max ? `${min}` : `${min} - ${max}`;
          return `${min ?? max}`;
        };

        // 2) Stock + price aggregates per product (includes sale range)
        const stockPriceRows = await this.db
          .select({
            productId: productVariants.productId,
            stock: sql<number>`COALESCE(SUM(${inventoryItems.available}), 0)`,

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
          .leftJoin(
            inventoryItems,
            and(
              eq(inventoryItems.companyId, companyId),
              eq(inventoryItems.productVariantId, productVariants.id),
            ),
          )
          .where(
            and(
              eq(productVariants.companyId, companyId),
              inArray(productVariants.productId, productIds),
            ),
          )
          .groupBy(productVariants.productId)
          .execute();

        const stockPriceByProduct = new Map<
          string,
          {
            stock: number;
            minPrice: number | null;
            maxPrice: number | null;
            minSalePrice: number | null;
            maxSalePrice: number | null;
          }
        >();

        for (const r of stockPriceRows) {
          stockPriceByProduct.set(r.productId, {
            stock: Number(r.stock ?? 0),
            minPrice: r.minPrice == null ? null : Number(r.minPrice),
            maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
            minSalePrice:
              r.minSalePrice == null ? null : Number(r.minSalePrice),
            maxSalePrice:
              r.maxSalePrice == null ? null : Number(r.maxSalePrice),
          });
        }

        // 3) Ratings aggregates
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
          { ratingCount: number; averageRating: number }
        >();
        for (const r of ratingRows) {
          ratingsByProduct.set(r.productId, {
            ratingCount: Number(r.ratingCount ?? 0),
            averageRating: Number(r.averageRating ?? 0),
          });
        }

        // 4) Categories
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
            ),
          )
          .where(
            and(
              eq(productCategories.companyId, companyId),
              inArray(productCategories.productId, productIds),
            ),
          )
          .execute();

        const catsByProduct = new Map<string, { id: string; name: string }[]>();
        for (const r of catRows) {
          const list = catsByProduct.get(r.productId) ?? [];
          list.push({ id: r.categoryId, name: r.categoryName });
          catsByProduct.set(r.productId, list);
        }

        // merge + format
        return page.map((p) => {
          const sp = stockPriceByProduct.get(p.id) ?? {
            stock: 0,
            minPrice: null,
            maxPrice: null,
            minSalePrice: null,
            maxSalePrice: null,
          };

          const regularMin = sp.minPrice;
          const regularMax = sp.maxPrice;
          const saleMin = sp.minSalePrice;
          const saleMax = sp.maxSalePrice;

          const regularLabel = rangeLabel(regularMin, regularMax);
          const saleLabel = rangeLabel(saleMin, saleMax);

          // ✅ on sale only if min sale is lower than min regular
          const onSale = sp.minSalePrice != null;

          // ✅ what your frontend should prefer
          const price_html =
            onSale && regularLabel && saleLabel
              ? `<del>${regularLabel}</del> <ins>${saleLabel}</ins>`
              : (regularLabel ?? '');

          return {
            id: p.id,
            name: p.name,
            createdAt: p.createdAt,
            status: p.status,
            slug: p.slug,
            imageUrl: p.imageUrl ?? null,

            stock: sp.stock,

            // Woo-like numeric fields (mins)
            regular_price: sp.minPrice != null ? String(sp.minPrice) : null,
            sale_price:
              onSale && sp.minSalePrice != null
                ? String(sp.minSalePrice)
                : null,
            on_sale: onSale,
            price: String(onSale ? sp.minSalePrice : (sp.minPrice ?? 0)),
            price_html,

            // keep these if you still use them elsewhere
            minPrice: regularMin,
            maxPrice: regularMax,
            minSalePrice: saleMin,
            maxSalePrice: saleMax,

            categories: catsByProduct.get(p.id) ?? [],

            ratingCount: ratingsByProduct.get(p.id)?.ratingCount ?? 0,
            averageRating: ratingsByProduct.get(p.id)?.averageRating ?? 0,
          };
        });
      },
    );
  }

  async listProductsWithRelations(
    companyId: string,
    opts?: { limit?: number; offset?: number },
  ) {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const products = await this.db.query.products.findMany({
      where: (fields, { eq }) => eq(fields.companyId, companyId),
      with: {
        variants: true,
        options: { with: { values: true } },
        images: true,
        productCategories: { with: { category: true } },
        defaultVariant: true,
      },
      limit,
      offset,
      orderBy: (fields, { desc }) => desc(fields.createdAt),
    });

    return products;
  }

  async getProductById(companyId: string, productId: string) {
    return this.findProductByIdOrThrow(companyId, productId);
  }

  async getProductWithRelations(companyId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: (fields, { and, eq }) =>
        and(eq(fields.id, productId), eq(fields.companyId, companyId)),
      with: {
        variants: true,
        options: {
          with: { values: true },
        },
        images: true,
        productCategories: {
          with: { category: true },
        },
        defaultVariant: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product not found for company ${companyId}`);
    }
    return product;
  }

  // ✅ Full getProductWithRelationsBySlug with variant stock injected
  // Required imports at top of file:
  // import { inArray } from 'drizzle-orm';
  // import { inventoryItems, productReviews } from 'src/infrastructure/drizzle/schema';

  async getProductWithRelationsBySlug(companyId: string, slug: string) {
    const product = await this.db.query.products.findFirst({
      where: (fields, { and, eq, isNull }) =>
        and(
          eq(fields.slug, slug),
          eq(fields.companyId, companyId),
          eq(fields.status, 'active'),
          isNull(fields.deletedAt),
        ),
      with: {
        defaultImage: true,
        variants: { with: { image: true } },
        options: { with: { values: true } },
        images: true,
        productCategories: { with: { category: true } },
        defaultVariant: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Active product with slug "${slug}" not found`,
      );
    }

    // ✅ Reorder categories so parent is always first (then child), when possible
    const pcs = product.productCategories ?? [];
    const cats = pcs.map((pc) => pc.category).filter(Boolean) as Array<{
      id: string;
      parentId: string | null;
    }>;

    if (cats.length > 1) {
      const catById = new Map(cats.map((c) => [c.id, c]));
      const childWithParent = cats.find(
        (c) => c.parentId && catById.has(c.parentId),
      );

      if (childWithParent?.parentId) {
        const parentId = childWithParent.parentId;
        const childId = childWithParent.id;

        const pcByCatId = new Map(
          pcs.filter((pc) => pc.category).map((pc) => [pc.category!.id, pc]),
        );

        const parentPc = pcByCatId.get(parentId);
        const childPc = pcByCatId.get(childId);

        const rest = pcs.filter(
          (pc) => pc.category?.id !== parentId && pc.category?.id !== childId,
        );

        const reordered: typeof pcs = [];
        if (parentPc) reordered.push(parentPc);
        if (childPc) reordered.push(childPc);
        reordered.push(...rest);

        (product as any).productCategories = reordered;
      }
    }

    // ✅ Variant stock (SELLABLE stock only)
    const variantIds = (product.variants ?? [])
      .map((v) => v.id)
      .filter(Boolean);

    const stockByVariantId = new Map<string, number>();

    if (variantIds.length) {
      const stockRows = await this.db
        .select({
          variantId: inventoryItems.productVariantId,
          stock: sql<number>`
        GREATEST(
          COALESCE(SUM(${inventoryItems.available}), 0)
          - COALESCE(SUM(${inventoryItems.reserved}), 0)
          - COALESCE(SUM(${inventoryItems.safetyStock}), 0),
          0
        )
      `,
        })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.companyId, companyId),
            inArray(inventoryItems.productVariantId, variantIds),
          ),
        )
        .groupBy(inventoryItems.productVariantId)
        .execute();

      for (const r of stockRows) {
        stockByVariantId.set(r.variantId, Number(r.stock ?? 0));
      }
    }

    // attach stock to variants for mapper/FE
    (product as any).variants = (product.variants ?? []).map((v: any) => ({
      ...v,
      stock: stockByVariantId.get(v.id) ?? 0,
    }));

    // ✅ Correct + fast ratings (no join multiplication)
    const [r] = await this.db
      .select({
        ratingCount: sql<number>`COUNT(*)`,
        averageRating: sql<number>`
        COALESCE(ROUND(AVG(${productReviews.rating})::numeric, 2), 0)
      `,
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.companyId, companyId),
          eq(productReviews.productId, product.id),
          eq(productReviews.isApproved, true),
          sql`${productReviews.deletedAt} IS NULL`,
        ),
      )
      .execute();

    return {
      ...product,
      rating_count: Number(r?.ratingCount ?? 0),
      average_rating: Number(r?.averageRating ?? 0),
    };
  }

  async getProductForEdit(companyId: string, productId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'product', productId, 'edit'],
      async () => {
        // 1) product base fields (+ defaultImageId so we can compute defaultImageIndex)
        const product = await this.db
          .select({
            id: products.id,
            name: products.name,
            description: products.description,
            status: products.status,
            productType: products.productType,
            seoTitle: products.seoTitle,
            seoDescription: products.seoDescription,
            metadata: products.metadata,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
            moq: products.moq,
            defaultImageId: products.defaultImageId,
          })
          .from(products)
          .where(
            and(eq(products.companyId, companyId), eq(products.id, productId)),
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (!product) {
          throw new NotFoundException(
            `Product not found for company ${companyId}`,
          );
        }

        // 1b) all product images (ordered)
        const images = await this.db
          .select({
            id: productImages.id,
            url: productImages.url,
            altText: productImages.altText,
            position: productImages.position,
            fileName: productImages.fileName,
            mimeType: productImages.mimeType,
            size: productImages.size,
            width: productImages.width,
            height: productImages.height,
          })
          .from(productImages)
          .where(
            and(
              eq(productImages.companyId, companyId),
              eq(productImages.productId, productId),
            ),
          )
          .orderBy(productImages.position)
          .execute();

        // compute default image index (fallback -> 0)
        const foundDefaultIndex = images.findIndex(
          (img) => img.id === product.defaultImageId,
        );
        const defaultImageIndex =
          foundDefaultIndex >= 0 ? foundDefaultIndex : 0;

        // 2) categories -> categoryIds
        const cats = await this.db
          .select({ categoryId: productCategories.categoryId })
          .from(productCategories)
          .where(
            and(
              eq(productCategories.companyId, companyId),
              eq(productCategories.productId, productId),
            ),
          )
          .execute();

        const categoryIds = cats.map((c) => c.categoryId);

        // 3) links -> group into related/upsell/cross_sell
        const linksRows = await this.db
          .select({
            linkedProductId: productLinks.linkedProductId,
            linkType: productLinks.linkType,
            position: productLinks.position,
          })
          .from(productLinks)
          .where(
            and(
              eq(productLinks.companyId, companyId),
              eq(productLinks.productId, productId),
            ),
          )
          .execute();

        // stable order
        linksRows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const links: Partial<Record<ProductLinkType, string[]>> = {
          related: [],
          upsell: [],
          cross_sell: [],
        };

        for (const r of linksRows) {
          const t = r.linkType as ProductLinkType;
          if (t === 'related') links.related!.push(r.linkedProductId);
          else if (t === 'upsell') links.upsell!.push(r.linkedProductId);
          else if (t === 'cross_sell')
            links.cross_sell!.push(r.linkedProductId);
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description ?? null,
          status: product.status,
          productType: product.productType,
          moq: product.moq,
          images: images.map((img) => ({
            id: img.id,
            url: img.url,
          })),
          defaultImageIndex,
          seoTitle: product.seoTitle ?? null,
          seoDescription: product.seoDescription ?? null,
          metadata: (product.metadata ?? {}) as Record<string, any>,
          categoryIds,
          links,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
      },
    );
  }

  // ----------------- Update -----------------

  // ✅ UPDATED updateProduct() for client-side S3 uploads (receive keys/urls, no base64)
  // - expects dto.images?: { key: string; url?: string; fileName?; mimeType?; altText?; position? }[]
  // - enforces productType image limits (variable => 1, simple => 9)
  // - replaces images ONLY when dto.images is provided (same behavior as before)
  // - validates object exists in S3 (HEAD)
  // - optional: move tmp -> final folder (copy+delete) using aws.moveObject
  // - soft-deletes old rows and best-effort deletes old S3 objects (using extractKeyFromUrl)

  async updateProduct(
    companyId: string,
    productId: string,
    dto: UpdateProductDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findProductByIdOrThrow(companyId, productId);

    // -----------------------
    // Slug logic (unchanged)
    // -----------------------
    let slug = existing.slug;
    if (dto.slug) {
      slug = slugify(dto.slug);
      if (slug !== existing.slug) {
        await this.ensureSlugUnique(companyId, slug, productId);
      }
    }

    const updated = await this.db.transaction(async (tx) => {
      // Decide next product type
      const nextProductType = dto.productType ?? existing.productType;

      // -----------------------
      // 1) Update product fields
      // -----------------------
      const [p] = await tx
        .update(products)
        .set({
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          slug,
          status: dto.status ?? existing.status,
          isGiftCard: dto.isGiftCard ?? existing.isGiftCard,
          productType: nextProductType,
          seoTitle: dto.seoTitle ?? existing.seoTitle,
          seoDescription: dto.seoDescription ?? existing.seoDescription,
          moq: dto.moq ?? existing.moq,
          metadata: dto.metadata ?? existing.metadata,
          updatedAt: new Date(),
        })
        .where(
          and(eq(products.companyId, companyId), eq(products.id, productId)),
        )
        .returning()
        .execute();

      if (!p) throw new NotFoundException('Product not found');

      // ---------------------------------------------------------------------
      // 1b) Images replace (max based on productType) — ONLY if dto.images is provided
      // ---------------------------------------------------------------------
      if (dto.images) {
        const maxImages = nextProductType === 'variable' ? 1 : 9;

        // ✅ match createProduct behavior: throw instead of silently truncating
        if (Array.isArray(dto.images) && dto.images.length > maxImages) {
          throw new BadRequestException(
            `Too many images. Max is ${maxImages}.`,
          );
        }

        const incoming = Array.isArray(dto.images) ? dto.images : [];

        // Load current (non-deleted) images
        const currentImages = await tx
          .select({
            id: productImages.id,
            url: productImages.url,
            position: productImages.position,
          })
          .from(productImages)
          .where(
            and(
              eq(productImages.companyId, companyId),
              eq(productImages.productId, productId),
              isNull(productImages.deletedAt),
            ),
          )
          .orderBy(productImages.position)
          .execute();

        const inserted: Array<{ id: string; url: string; position: number }> =
          [];

        for (let i = 0; i < incoming.length; i++) {
          const img = incoming[i];

          if (!img?.key && !img?.url) {
            throw new BadRequestException('Image must include key or url');
          }

          const key =
            img.key ?? (img.url ? this.aws.extractKeyFromUrl(img.url) : null);

          if (!key) throw new BadRequestException('Invalid image url/key');

          const prefix = `companies/${companyId}/products/`;
          if (!key.startsWith(prefix) || key.includes('..')) {
            throw new BadRequestException('Invalid image key');
          }

          try {
            await this.aws.assertObjectExists(key);
          } catch {
            throw new BadRequestException(
              'Uploaded image not found in storage',
            );
          }

          const position = typeof img.position === 'number' ? img.position : i;

          const isTmp = key.includes('/tmp/');
          const safeProvidedName = this.sanitizeFileName(img.fileName);

          const inferredExt = img.mimeType?.startsWith('image/')
            ? `.${img.mimeType.split('/')[1] || 'jpg'}`
            : '.jpg';

          const finalFileName =
            safeProvidedName && safeProvidedName.includes('.')
              ? safeProvidedName
              : safeProvidedName
                ? `${safeProvidedName}${inferredExt}`
                : `product-${productId}-${position}-${Date.now()}${inferredExt}`;

          const finalKey = isTmp
            ? `companies/${companyId}/products/${productId}/${finalFileName}`
            : key;

          const moved = isTmp
            ? await this.aws.moveObject({ fromKey: key, toKey: finalKey })
            : {
                key: finalKey,
                url:
                  img.url ??
                  `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${finalKey}`,
              };

          const mimeType =
            (img.mimeType ?? 'image/jpeg').trim() || 'image/jpeg';

          const [row] = await tx
            .insert(productImages)
            .values({
              companyId,
              productId,
              variantId: null,
              url: moved.url,
              altText: img.altText ?? `${p.name} product image`,
              fileName: img.fileName ?? finalFileName ?? null,
              mimeType,
              size: null,
              width: null,
              height: null,
              position,
            })
            .returning()
            .execute();

          inserted.push({ id: row.id, url: row.url, position });
        }

        const safeDefaultIndex =
          nextProductType === 'variable' ? 0 : (dto.defaultImageIndex ?? 0);

        const chosen = inserted[safeDefaultIndex] ?? inserted[0] ?? null;

        await tx
          .update(products)
          .set({
            defaultImageId: chosen ? chosen.id : null,
            updatedAt: new Date(),
          })
          .where(
            and(eq(products.companyId, companyId), eq(products.id, productId)),
          )
          .execute();

        // Soft-delete old image rows
        if (currentImages.length) {
          await tx
            .update(productImages)
            .set({ deletedAt: new Date() })
            .where(
              and(
                eq(productImages.companyId, companyId),
                eq(productImages.productId, productId),
                isNull(productImages.deletedAt),
              ),
            )
            .execute();

          // Best-effort S3 cleanup
          for (const old of currentImages) {
            const oldKey = this.aws.extractKeyFromUrl(old.url);
            if (!oldKey) continue;
            try {
              await this.aws.deleteFromS3(oldKey);
            } catch {
              // ignore
            }
          }
        }

        // ✅ If simple: keep default variant image in sync (optional but recommended)
        if (nextProductType === 'simple') {
          const defaultVariant = await tx
            .select({ id: productVariants.id })
            .from(productVariants)
            .where(
              and(
                eq(productVariants.companyId, companyId),
                eq(productVariants.productId, productId),
                eq(productVariants.title, 'Default'),
              ),
            )
            .limit(1)
            .execute()
            .then((r) => r[0]);

          if (defaultVariant) {
            await tx
              .update(productVariants)
              .set({ imageId: chosen?.id ?? null, updatedAt: new Date() })
              .where(
                and(
                  eq(productVariants.companyId, companyId),
                  eq(productVariants.id, defaultVariant.id),
                ),
              )
              .execute();
          }
        }
      }

      // ---------------------------------------------------------------------
      // 2) replace categories if provided
      // ---------------------------------------------------------------------
      if (dto.categoryIds) {
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));

        await this.categoryService.assertCategoriesBelongToCompany(
          companyId,
          uniqueCategoryIds,
        );

        await tx
          .delete(productCategories)
          .where(
            and(
              eq(productCategories.companyId, companyId),
              eq(productCategories.productId, productId),
            ),
          )
          .execute();

        if (uniqueCategoryIds.length) {
          await tx
            .insert(productCategories)
            .values(
              uniqueCategoryIds.map((categoryId) => ({
                companyId,
                productId,
                categoryId,
              })),
            )
            .execute();
        }
      }

      // ---------------------------------------------------------------------
      // 3) replace links if provided
      // ---------------------------------------------------------------------
      if (dto.links) {
        const linksByType = dto.links ?? {};

        const allLinkedIds: string[] = [];
        for (const ids of Object.values(linksByType)) {
          if (Array.isArray(ids)) allLinkedIds.push(...ids);
        }

        const uniqueAllLinkedIds = Array.from(
          new Set(allLinkedIds.filter((id) => id && id !== productId)),
        );

        if (uniqueAllLinkedIds.length) {
          await this.linkedProductsService.assertProductsBelongToCompany(
            companyId,
            uniqueAllLinkedIds,
          );
        }

        await tx
          .delete(productLinks)
          .where(
            and(
              eq(productLinks.companyId, companyId),
              eq(productLinks.productId, productId),
            ),
          )
          .execute();

        const rowsToInsert: (typeof productLinks.$inferInsert)[] = [];

        for (const [linkType, ids] of Object.entries(linksByType) as Array<
          [ProductLinkType, string[]]
        >) {
          if (!ids?.length) continue;

          const cleaned = Array.from(
            new Set(ids.filter((id) => id && id !== productId)),
          );

          cleaned.forEach((linkedProductId, index) => {
            rowsToInsert.push({
              companyId,
              productId,
              linkedProductId,
              linkType,
              position: index + 1,
            });
          });
        }

        if (rowsToInsert.length) {
          await tx.insert(productLinks).values(rowsToInsert).execute();
        }
      }

      // ---------------------------------------------------------------------
      // 4) ✅ SIMPLE product: upsert Default variant (no duplicate creation)
      // ---------------------------------------------------------------------
      if (nextProductType === 'simple') {
        // find existing default variant
        const defaultVariant = await tx
          .select({
            id: productVariants.id,
            sku: productVariants.sku,
          })
          .from(productVariants)
          .where(
            and(
              eq(productVariants.companyId, companyId),
              eq(productVariants.productId, productId),
              eq(productVariants.title, 'Default'),
            ),
          )
          .limit(1)
          .execute()
          .then((r) => r[0]);

        // SKU uniqueness if sku provided & changed
        const incomingSku = dto.sku?.trim() ? dto.sku.trim() : undefined;
        if (incomingSku) {
          const currentSku = defaultVariant?.sku ?? null;
          if (!currentSku || currentSku !== incomingSku) {
            await this.ensureSkuUnique(companyId, incomingSku);
          }
        }

        // variant metadata (keep separate from product metadata)
        const variantMetadataPatch: Record<string, any> = {};
        if (dto.lowStockThreshold !== undefined) {
          variantMetadataPatch.low_stock_threshold = dto.lowStockThreshold;
        }

        // Get product default image for variant image sync
        const productRow = await tx
          .select({ defaultImageId: products.defaultImageId })
          .from(products)
          .where(
            and(eq(products.companyId, companyId), eq(products.id, productId)),
          )
          .limit(1)
          .execute()
          .then((r) => r[0]);

        let variantId: string;

        if (defaultVariant) {
          // update existing default variant
          const updates: Partial<typeof productVariants.$inferInsert> = {
            updatedAt: new Date(),
          };

          // Only update fields if provided (so partial update doesn't wipe)
          if (dto.sku !== undefined) updates.sku = incomingSku ?? null;
          if (dto.barcode !== undefined)
            updates.barcode = dto.barcode?.trim() ? dto.barcode.trim() : null;

          // Only update regularPrice if provided (allows null to clear)
          if (dto.regularPrice !== undefined) {
            const v =
              dto.regularPrice === null
                ? undefined
                : String(dto.regularPrice).trim();
            if (v) updates.regularPrice = v; // only update if non-empty
          }

          // Only update salePrice if provided (allows null to clear)
          if (dto.salePrice !== undefined) {
            const v =
              dto.salePrice === null ? undefined : String(dto.salePrice).trim();

            if (v) {
              updates.salePrice = v; // update
            }
          }

          if (dto.weight !== undefined)
            updates.weight = dto.weight?.trim() ? dto.weight.trim() : null;
          if (dto.length !== undefined)
            updates.length = dto.length?.trim() ? dto.length.trim() : null;
          if (dto.width !== undefined)
            updates.width = dto.width?.trim() ? dto.width.trim() : null;
          if (dto.height !== undefined)
            updates.height = dto.height?.trim() ? dto.height.trim() : null;

          // If you want to keep variant image aligned with product default image:
          if (productRow) updates.imageId = productRow.defaultImageId ?? null;

          // Merge metadata if needed
          if (dto.lowStockThreshold !== undefined) {
            // pull existing metadata to merge
            const current = await tx
              .select({ metadata: productVariants.metadata })
              .from(productVariants)
              .where(
                and(
                  eq(productVariants.companyId, companyId),
                  eq(productVariants.id, defaultVariant.id),
                ),
              )
              .limit(1)
              .execute()
              .then((r) => r[0]);

            updates.metadata = {
              ...(current?.metadata ?? {}),
              ...variantMetadataPatch,
            };
          }

          await tx
            .update(productVariants)
            .set(updates)
            .where(
              and(
                eq(productVariants.companyId, companyId),
                eq(productVariants.id, defaultVariant.id),
              ),
            )
            .execute();

          variantId = defaultVariant.id;
        } else {
          // create default variant only if missing
          const [variant] = await tx
            .insert(productVariants)
            .values({
              companyId,
              productId,
              storeId: p.storeId,
              imageId: productRow?.defaultImageId ?? null,
              title: 'Default',
              sku: incomingSku ?? null,
              barcode: dto.barcode?.trim() ? dto.barcode.trim() : null,
              option1: null,
              option2: null,
              option3: null,
              isActive: true,
              regularPrice: dto.regularPrice ?? '0',
              salePrice: dto.salePrice?.trim() ? dto.salePrice.trim() : null,
              currency: 'NGN',
              weight: dto.weight?.trim() ? dto.weight.trim() : null,
              length: dto.length?.trim() ? dto.length.trim() : null,
              width: dto.width?.trim() ? dto.width.trim() : null,
              height: dto.height?.trim() ? dto.height.trim() : null,
              metadata: variantMetadataPatch,
            })
            .returning()
            .execute();

          variantId = variant.id;
        }

        // Inventory: only update when caller sends values
        const shouldUpdateInventory =
          dto.stockQuantity !== undefined ||
          dto.lowStockThreshold !== undefined;

        if (shouldUpdateInventory) {
          const stockQty =
            dto.stockQuantity !== undefined &&
            String(dto.stockQuantity).trim() !== ''
              ? Number(dto.stockQuantity)
              : 0;

          const safetyStock =
            dto.lowStockThreshold !== undefined &&
            String(dto.lowStockThreshold).trim() !== ''
              ? Number(dto.lowStockThreshold)
              : 0;

          await this.inventoryService.setInventoryLevel(
            companyId,
            variantId,
            stockQty,
            safetyStock,
            user,
            ip,
            { tx, skipCacheBump: true, skipAudit: true },
          );
        }
      }

      return p;
    });

    // ---------------------------------------------------------------------
    // After TX: sales category sync (optional but matches createProduct)
    // ---------------------------------------------------------------------
    const finalProductType = dto.productType ?? existing.productType;

    // if salePrice was provided in this update, use it to decide.
    // otherwise, you might need to read the variant price to know whether it is now on sale.
    const shouldSyncSalesCategory =
      finalProductType === 'simple' &&
      dto.salePrice !== undefined &&
      dto.salePrice != null &&
      String(dto.salePrice).trim() !== '';

    if (shouldSyncSalesCategory) {
      await this.categoryService.syncSalesCategoryForProduct({
        companyId,
        storeId: updated.storeId,
        productId: updated.id,
      });
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated product',
        changes: {
          companyId,
          productId: updated.id,
          before: {
            name: existing.name,
            description: existing.description,
            slug: existing.slug,
            status: existing.status,
            isGiftCard: existing.isGiftCard,
            productType: existing.productType,
            seoTitle: existing.seoTitle,
            seoDescription: existing.seoDescription,
            metadata: existing.metadata,
            defaultImageId: existing.defaultImageId,
          },
          after: {
            name: updated.name,
            description: updated.description,
            slug: updated.slug,
            status: updated.status,
            isGiftCard: updated.isGiftCard,
            productType: updated.productType,
            seoTitle: updated.seoTitle,
            seoDescription: updated.seoDescription,
            metadata: updated.metadata,
          },
          categoryIds: dto.categoryIds,
          links: dto.links,
          imagesCount: dto.images?.length,
          defaultImageIndex:
            (dto.productType ?? existing.productType) === 'variable'
              ? 0
              : dto.defaultImageIndex,
          // helpful audit fields for simple
          ...(finalProductType === 'simple'
            ? {
                sku: dto.sku ?? undefined,
                regularPrice: dto.regularPrice ?? undefined,
                salePrice: dto.salePrice ?? undefined,
                stockQuantity: dto.stockQuantity ?? undefined,
                lowStockThreshold: dto.lowStockThreshold ?? undefined,
              }
            : {}),
        },
      });
    }

    return updated;
  }

  // ----------------- Delete (soft) -----------------

  async deleteProduct(
    companyId: string,
    productId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findProductByIdOrThrow(companyId, productId);

    // Soft delete: mark deletedAt; you may also want to set status = 'archived'
    const [deleted] = await this.db
      .update(products)
      .set({
        deletedAt: new Date(),
        status: 'archived',
      })
      .where(and(eq(products.companyId, companyId), eq(products.id, productId)))
      .returning()
      .execute();

    if (!deleted) {
      throw new NotFoundException('Product not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'product',
        entityId: productId,
        userId: user.id,
        ipAddress: ip,
        details: 'Soft deleted product',
        changes: {
          companyId,
          productId,
          name: existing.name,
          slug: existing.slug,
        },
      });
    }

    return { success: true };
  }

  // ----------------- Categories Mapping -----------------

  async assignCategories(
    companyId: string,
    productId: string,
    dto: AssignProductCategoriesDto,
    user?: User,
    ip?: string,
  ) {
    await this.findProductByIdOrThrow(companyId, productId);

    const categoryIds = dto.categoryIds ?? [];

    if (categoryIds.length) {
      // Validate categories belong to this company
      const cats = await this.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.companyId, companyId))
        .execute();

      const validIds = new Set(cats.map((c) => c.id));
      const invalid = categoryIds.filter((id) => !validIds.has(id));

      if (invalid.length > 0) {
        throw new BadRequestException(
          `Some categories do not belong to this company: ${invalid.join(', ')}`,
        );
      }
    }

    // Remove previous mappings
    await this.db
      .delete(productCategories)
      .where(eq(productCategories.productId, productId))
      .execute();

    let inserted: (typeof productCategories.$inferSelect)[] = [];
    if (categoryIds.length) {
      inserted = await this.db
        .insert(productCategories)
        .values(
          categoryIds.map((categoryId) => ({
            productId,
            categoryId,
            companyId,
          })),
        )
        .returning()
        .execute();
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product_categories',
        entityId: productId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated categories assigned to product',
        changes: {
          companyId,
          productId,
          categoryIds,
        },
      });
    }

    return inserted;
  }

  // ----------------Helper of Collections and Pages --------------

  private async getCategoryAndDescendantIds(
    companyId: string,
    storeId: string,
    categoryId: string,
  ) {
    const res = await this.db.execute(sql`
    WITH RECURSIVE subcats AS (
      SELECT id
      FROM ${categories}
      WHERE company_id = ${companyId}
        AND store_id = ${storeId}
        AND id = ${categoryId}
        AND deleted_at IS NULL

      UNION ALL

      SELECT c.id
      FROM ${categories} c
      JOIN subcats s ON c.parent_id = s.id
      WHERE c.company_id = ${companyId}
        AND c.store_id = ${storeId}
        AND c.deleted_at IS NULL
    )
    SELECT id FROM subcats
  `);

    const ids = (res as any).rows?.map((r: any) => r.id) ?? [categoryId];
    return ids as string[];
  }

  // Add these types somewhere appropriate (top of file or near the method)

  async listCollectionProductsByCategorySlug(
    companyId: string,
    storeId: string,
    categorySlug: string,
    query: ProductQueryDto,
  ): Promise<
    CollectionResponse<ReturnType<typeof mapProductToCollectionListResponse>>
  > {
    const { search, status, limit = 12, offset = 0 } = query;
    const effectiveStatus = status ?? 'active';
    const attr = query.attr ?? {};

    /* ================= CACHE KEY ================= */
    const stableAttr = Object.fromEntries(
      Object.entries(attr)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, Array.isArray(v) ? [...v].sort() : v]),
    );

    const cacheKey = [
      'catalog',
      'collections',
      'products',
      'byCategorySlug',
      storeId,
      categorySlug,
      JSON.stringify({
        search: search ?? null,
        status: effectiveStatus,
        limit,
        offset,
        attr: stableAttr,
      }),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      /* ================= CATEGORY ================= */
      const [category] = await this.db
        .select({
          id: categories.id,
          name: categories.name,
          slug: categories.slug,
          description: categories.description,
          afterContentHtml: categories.afterContentHtml,
          metaTitle: categories.metaTitle,
          metaDescription: categories.metaDescription,
          imageUrl: media.url,
          imageAltText: media.altText,
        })
        .from(categories)
        .leftJoin(
          media,
          and(
            eq(media.companyId, categories.companyId),
            eq(media.storeId, categories.storeId),
            eq(media.id, (categories as any).imageMediaId),
            isNull(media.deletedAt),
          ),
        )
        .where(
          and(
            eq(categories.companyId, companyId),
            eq(categories.storeId, storeId),
            eq(categories.slug, categorySlug),
            isNull(categories.deletedAt),
          ),
        )
        .limit(1)
        .execute();

      if (!category) return { category: null, products: [] };

      const categoryForResponse: CollectionCategory = {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        afterContentHtml: category.afterContentHtml ?? null,
        metaTitle: category.metaTitle ?? null,
        metaDescription: category.metaDescription ?? null,
        imageUrl: category.imageUrl ?? null,
        imageAltText: category.imageAltText ?? null,
      };

      /* ================= CATEGORY IDS ================= */
      const hasChild = await this.db.query.categories.findFirst({
        where: (c, { and, eq, isNull }) =>
          and(
            eq(c.companyId, companyId),
            eq(c.storeId, storeId),
            eq(c.parentId, category.id),
            isNull(c.deletedAt),
          ),
        columns: { id: true },
      });

      const categoryIds = hasChild
        ? await this.getCategoryAndDescendantIds(
            companyId,
            storeId,
            category.id,
          )
        : [category.id];

      /* ================= PRODUCT IDS ================= */
      const whereSql: any[] = [
        sql`${products.companyId} = ${companyId}`,
        sql`${products.storeId} = ${storeId}`,
        sql`${products.status} = ${effectiveStatus}`,
        sql`${products.deletedAt} IS NULL`,
        sql`EXISTS (
        SELECT 1 FROM ${productCategories} pc
        WHERE pc.company_id = ${companyId}
          AND pc.product_id = ${products.id}
          AND pc.category_id IN (${sql.join(
            categoryIds.map((id) => sql`${id}`),
            sql`, `,
          )})
      )`,
      ];

      if (search) whereSql.push(sql`${products.name} ILIKE ${`%${search}%`}`);

      for (const [attrName, attrValue] of Object.entries(attr)) {
        const values = Array.isArray(attrValue) ? attrValue : [attrValue];

        whereSql.push(sql`
        EXISTS (
          SELECT 1
          FROM ${productOptions} po
          JOIN ${productOptionValues} pov
            ON pov.company_id = po.company_id
           AND pov.product_option_id = po.id
          WHERE po.company_id = ${companyId}
            AND po.product_id = ${products.id}
            AND po.name = ${attrName}
            AND pov.value IN (${sql.join(
              values.map((v) => sql`${v}`),
              sql`, `,
            )})
        )
      `);
      }

      const idRows = await this.db
        .select({ id: products.id })
        .from(products)
        .where(sql`${sql.join(whereSql, sql` AND `)}`)
        .orderBy(sql`${products.createdAt} DESC`)
        .limit(limit)
        .offset(offset)
        .execute();

      const productIds = idRows.map((r) => r.id);
      if (!productIds.length)
        return { category: categoryForResponse, products: [] };

      /* ================= PRODUCT GRAPH ================= */
      const fullProducts = await this.db.query.products.findMany({
        where: (p, { and, eq, inArray, isNull }) =>
          and(
            eq(p.companyId, companyId),
            eq(p.storeId, storeId),
            inArray(p.id, productIds),
            isNull(p.deletedAt),
          ),
        with: {
          defaultImage: true,
          images: true,
          options: { with: { values: true } },
          productCategories: { with: { category: true } },
        },
      });

      const fullById = new Map(fullProducts.map((p) => [p.id, p]));
      const ordered = productIds
        .map((id) => fullById.get(id))
        .filter(Boolean) as any[];

      /* ================= RATINGS ================= */
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

      /* ================= PRICING (SALE AWARE) ================= */
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
            sql`${productVariants.deletedAt} IS NULL`,
            eq(productVariants.isActive, true),
          ),
        )
        .groupBy(productVariants.productId)
        .execute();

      const priceByProduct = new Map<
        string,
        {
          minRegular: number;
          maxRegular: number;
          minSale: number;
          onSale: boolean;
        }
      >();

      for (const r of priceRows) {
        priceByProduct.set(r.productId, {
          minRegular: Number(r.minRegular ?? 0),
          maxRegular: Number(r.maxRegular ?? r.minRegular ?? 0),
          minSale: Number(r.minSale ?? 0),
          onSale: Number(r.onSale) === 1,
        });
      }

      /* ================= MAP ================= */
      const productsList = ordered.map((p) => {
        const ratings = ratingsByProduct.get(p.id) ?? {
          rating_count: 0,
          average_rating: 0,
        };

        const price = priceByProduct.get(p.id) ?? {
          minRegular: 0,
          maxRegular: 0,
          minSale: 0,
          onSale: false,
        };

        return mapProductToCollectionListResponse({
          ...p,
          rating_count: ratings.rating_count,
          average_rating: ratings.average_rating,
          ...price,
        } as any);
      });

      return {
        category: categoryForResponse,
        products: productsList,
      };
    });
  }

  async listProductsGroupedUnderParentCategory(
    companyId: string,
    storeId: string,
    parentCategoryId: string,
    query: ProductQueryDto,
  ) {
    const { status, search, limit = 8, offset = 0 } = query;
    const effectiveStatus = status ?? 'active';

    // 0) Fetch parent category (SEO should come from here)
    const parent = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: media.url,
        imageAltText: media.altText,
        afterContentHtml: categories.afterContentHtml,
        metaTitle: categories.metaTitle,
        metaDescription: categories.metaDescription,
      })
      .from(categories)
      .leftJoin(
        media,
        and(
          eq(media.companyId, categories.companyId),
          eq(media.storeId, categories.storeId),
          eq(media.id, (categories as any).imageMediaId),
          isNull(media.deletedAt),
        ),
      )
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.storeId, storeId),
          eq(categories.id, parentCategoryId),
          sql`${categories.deletedAt} IS NULL`,
        ),
      )
      .limit(1)
      .execute()
      .then((r) => r[0]);

    if (!parent?.id) return { parent: null, groups: [], exploreMore: [] };

    // 1) fetch direct child categories (buckets) - ✅ NO SEO META on children
    const childCats = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: media.url,
        imageAltText: media.altText,
        afterContentHtml: categories.afterContentHtml,
        // ❌ metaTitle/metaDescription removed from children
      })
      .from(categories)
      .leftJoin(
        media,
        and(
          eq(media.companyId, categories.companyId),
          eq(media.storeId, categories.storeId),
          eq(media.id, (categories as any).imageMediaId),
          isNull(media.deletedAt),
        ),
      )
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.storeId, storeId),
          eq(categories.parentId, parentCategoryId),
          sql`${categories.deletedAt} IS NULL`,
        ),
      )
      .orderBy(categories.name)
      .execute();

    // If parent has no children, still return parent + exploreMore
    const childCatIds = childCats.map((c) => c.id);

    const exploreMore = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageUrl: media.url,
      })
      .from(categories)
      .leftJoin(
        media,
        and(
          eq(media.companyId, categories.companyId),
          eq(media.storeId, categories.storeId),
          eq(media.id, (categories as any).imageMediaId),
          isNull(media.deletedAt),
        ),
      )
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.storeId, storeId),
          sql`${categories.deletedAt} IS NULL`,

          // ✅ require image
          isNotNull(media.url),

          // not the parent
          sql`${categories.id} <> ${parentCategoryId}`,

          // not direct children under the parent
          childCatIds.length
            ? sql`${categories.id} NOT IN (${sql.join(
                childCatIds.map((id) => sql`${id}`),
                sql`, `,
              )})`
            : sql`TRUE`,

          // must not be under the parent (directly)
          sql`${categories.parentId} <> ${parentCategoryId}`,
        ),
      )
      .orderBy(sql`RANDOM()`)
      .limit(3)
      .execute();

    // If no child categories, return now (still with exploreMore)
    if (childCats.length === 0) {
      return { parent, groups: [], exploreMore };
    }

    // 2) pick products for those categories with per-category pagination
    const productRows = await this.db.execute(sql`
    WITH ranked AS (
      SELECT
        pc.category_id AS category_id,
        p.id           AS product_id,
        ROW_NUMBER() OVER (
          PARTITION BY pc.category_id
          ORDER BY p.created_at DESC
        ) AS rn
      FROM ${productCategories} pc
      JOIN ${products} p
        ON p.company_id = pc.company_id
       AND p.id = pc.product_id
      WHERE pc.company_id = ${companyId}
        AND pc.category_id IN (${sql.join(
          childCatIds.map((id) => sql`${id}`),
          sql`, `,
        )})
        AND p.store_id = ${storeId}
        AND p.status = ${effectiveStatus}
        AND p.deleted_at IS NULL
        ${search ? sql`AND p.name ILIKE ${`%${search}%`}` : sql``}
    )
    SELECT category_id, product_id
    FROM ranked
    WHERE rn > ${offset} AND rn <= ${offset + limit}
  `);

    const pairs: { category_id: string; product_id: string }[] = ((
      productRows as any
    ).rows ?? []) as any[];

    if (pairs.length === 0) {
      return {
        parent,
        groups: childCats.map((c) => ({ category: c, products: [] })),
        exploreMore,
      };
    }

    const productIds = [...new Set(pairs.map((x) => x.product_id))];

    // 3) fetch base product info + default image
    const base = await this.db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        createdAt: products.createdAt,
        status: products.status,
        imageUrl: productImages.url,
      })
      .from(products)
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, products.companyId),
          eq(productImages.id, products.defaultImageId),
        ),
      )
      .where(
        and(
          eq(products.companyId, companyId),
          eq(products.storeId, storeId),
          inArray(products.id, productIds),
        ),
      )
      .execute();

    const baseById = new Map(base.map((p) => [p.id, p]));

    // 4) aggregates (stock/price)
    const stockPriceRows = await this.db
      .select({
        productId: productVariants.productId,
        stock: sql<number>`COALESCE(SUM(${inventoryItems.available}), 0)`,
        minPrice: sql<
          string | null
        >`MIN(NULLIF(${productVariants.regularPrice}, 0))`,
        maxPrice: sql<
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
        // ✅ add: any on sale?
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
      .leftJoin(
        inventoryItems,
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.productVariantId, productVariants.id),
        ),
      )
      .where(
        and(
          eq(productVariants.companyId, companyId),
          inArray(productVariants.productId, productIds),
        ),
      )
      .groupBy(productVariants.productId)
      .execute();

    const spByProduct = new Map<
      string,
      {
        stock: number;
        minPrice: number | null;
        maxPrice: number | null;
        minSale: number | null;
        onSale: boolean;
      }
    >();
    for (const r of stockPriceRows) {
      spByProduct.set(r.productId, {
        stock: Number(r.stock ?? 0),
        minPrice: r.minPrice == null ? null : Number(r.minPrice),
        maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
        minSale: r.minSale == null ? null : Number(r.minSale),
        onSale: Number(r.onSale ?? 0) === 1,
      });
    }

    // 5) aggregates (ratings)
    const ratingRows = await this.db
      .select({
        productId: productReviews.productId,
        ratingCount: sql<number>`COUNT(*)`,
        averageRating: sql<number>`COALESCE(ROUND(AVG(${productReviews.rating})::numeric, 2), 0)`,
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
      { ratingCount: number; averageRating: number }
    >();
    for (const r of ratingRows) {
      ratingsByProduct.set(r.productId, {
        ratingCount: Number(r.ratingCount ?? 0),
        averageRating: Number(r.averageRating ?? 0),
      });
    }

    // 6) build grouped response
    const productsByCategory = new Map<string, any[]>();
    for (const { category_id, product_id } of pairs) {
      const b = baseById.get(product_id);
      if (!b) continue;

      const sp = spByProduct.get(product_id) ?? {
        stock: 0,
        minPrice: null,
        maxPrice: null,
        minSale: null,
        onSale: false,
      };

      const rt = ratingsByProduct.get(product_id) ?? {
        ratingCount: 0,
        averageRating: 0,
      };

      const minRegular = Number(sp.minPrice ?? 0);
      const maxRegular = Number(sp.maxPrice ?? sp.minPrice ?? 0);

      const onSale = Boolean(sp.onSale);
      const minSale = sp.minSale == null ? null : Number(sp.minSale);

      const images = b.imageUrl
        ? {
            id: 'default',
            src: b.imageUrl,
            alt: null,
          }
        : null;

      // keep your old `price` behavior (min regular)
      const productDto = {
        id: b.id,
        name: b.name,
        slug: b.slug,
        images: images ? [images] : [],

        stock: sp.stock,

        // ✅ keep existing fields
        price: String(minRegular),
        regular_price: String(minRegular),

        // ✅ add sale fields
        sale_price: onSale && minSale ? String(minSale) : null,
        on_sale: onSale,

        // ✅ discount-aware html (otherwise same range)
        price_html: buildDiscountAwarePriceHtml(
          minRegular,
          maxRegular,
          minSale,
          onSale,
        ),

        averageRating: rt.averageRating,
        ratingCount: rt.ratingCount,
      };

      const list = productsByCategory.get(category_id) ?? [];
      list.push(productDto);
      productsByCategory.set(category_id, list);
    }

    return {
      parent,
      groups: childCats.map((c) => ({
        category: c,
        products: productsByCategory.get(c.id) ?? [],
      })),
      exploreMore,
    };
  }

  async listProductsGroupedUnderParentCategorySlug(
    companyId: string,
    storeId: string,
    parentSlug: string,
    query: ProductQueryDto,
  ) {
    const parent = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.storeId, storeId),
          eq(categories.slug, parentSlug),
          sql`${categories.deletedAt} IS NULL`,
        ),
      )
      .limit(1)
      .execute()
      .then((r) => r[0]);

    if (!parent?.id) return { parent: null, groups: [], exploreMore: [] };

    return this.listProductsGroupedUnderParentCategory(
      companyId,
      storeId,
      parent.id,
      query,
    );
  }

  private async ensureSkuUnique(
    companyId: string,
    sku: string | undefined,
    excludeVariantId?: string,
  ) {
    if (!sku) return;

    const existing = await this.db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.sku, sku),
        ),
      )
      .execute();

    const conflict = existing.find((v) => v.id !== excludeVariantId);

    if (conflict) {
      throw new ConflictException(
        `SKU "${sku}" already exists for this company`,
      );
    }
  }
}
