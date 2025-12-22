// src/modules/catalog/products.service.ts
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, inArray, sql } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
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
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { slugify } from '../utils/slugify';
import {
  AssignProductCategoriesDto,
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from '../dtos/products';
import { CategoriesService } from './categories.service';
import { LinkedProductsService } from './linked-products.service';
import { AwsService } from 'src/common/aws/aws.service';
import { mapProductToCollectionListResponse } from '../mappers/product.mapper';

@Injectable()
export class ProductsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly categoryService: CategoriesService,
    private readonly linkedProductsService: LinkedProductsService,
    private readonly aws: AwsService,
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

  // ----------------- Create -----------------
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

    const created = await this.db.transaction(async (tx) => {
      // 1) Create product
      const [product] = await tx
        .insert(products)
        .values({
          companyId,
          storeId: dto.storeId,
          name: dto.name,
          description: dto.description ?? null,
          slug,
          status: dto.status ?? 'draft',
          productType: dto.productType ?? 'simple',
          isGiftCard: dto.isGiftCard ?? false,
          seoTitle: dto.seoTitle ?? null,
          seoDescription: dto.seoDescription ?? null,
          metadata: dto.metadata ?? {},
        })
        .returning()
        .execute();

      if (dto.base64Image) {
        const fileName = `${product.id}-default-${Date.now()}.jpg`;
        const url = await this.aws.uploadImageToS3(
          companyId,
          fileName,
          dto.base64Image,
        );

        const [img] = await tx
          .insert(productImages)
          .values({
            companyId,
            productId: product.id,
            variantId: null,
            url,
            altText: dto.imageAltText ?? `${product.name} product image`,
            position: 0,
          })
          .returning()
          .execute();

        await tx
          .update(products)
          .set({ defaultImageId: img.id, updatedAt: new Date() })
          .where(
            and(eq(products.companyId, companyId), eq(products.id, product.id)),
          );
      }

      // 2) Assign categories (only INSERT; no delete needed for a new product)
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

      // 3) Insert linked products (if provided)
      // flatten + validate all linked ids
      const allLinkedIds: string[] = [];
      for (const ids of Object.values(linksByType)) {
        if (Array.isArray(ids)) allLinkedIds.push(...ids);
      }

      const uniqueAllLinkedIds = Array.from(
        new Set(allLinkedIds.filter((id) => id && id !== product.id)),
      );

      if (uniqueAllLinkedIds.length) {
        // validate they belong to company
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

      return product;
    });

    // bump once after tx
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
          categoryIds: uniqueCategoryIds,
          links: dto.links ?? {},
        },
      });
    }

    return created;
  }

  // ----------------- Read / Query -----------------
  // Admin panel
  async listProductsAdmin(companyId: string, query: ProductQueryDto) {
    const {
      search,
      status,
      categoryId,
      storeId,
      limit = 50,
      offset = 0,
    } = query;

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'catalog',
        'products',
        'admin',
        JSON.stringify({
          storeId: storeId ?? null, // ✅
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

        // ✅ store scope
        if (storeId) whereClauses.push(eq(products.storeId, storeId));

        if (status === 'archived')
          whereClauses.push(sql`${products.deletedAt} IS NOT NULL`);
        else whereClauses.push(sql`${products.deletedAt} IS NULL`);

        if (search) whereClauses.push(ilike(products.name, `%${search}%`));

        // ✅ count must respect storeId + categoryId
        let count: number;

        if (categoryId) {
          const countWithCategoryQuery = this.db
            .select({ count: sql<number>`count(distinct ${products.id})` })
            .from(products)
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

          const [{ count: categoryCount }] = await countWithCategoryQuery
            .where(and(...whereClauses))
            .execute();
          count = Number(categoryCount) || 0;
        } else {
          const countWithoutCategoryQuery = this.db
            .select({ count: sql<number>`count(distinct ${products.id})` })
            .from(products);

          const [{ count: basicCount }] = await countWithoutCategoryQuery
            .where(and(...whereClauses))
            .execute();
          count = Number(basicCount) || 0;
        }

        const total = Number(count) || 0;

        // ✅ items list must also receive storeId
        const items = await this.listProducts(companyId, query);

        return { items, total, limit, offset };
      },
    );
  }

  // store front
  async listProducts(companyId: string, query: ProductQueryDto) {
    const {
      search,
      status,
      categoryId,
      storeId,
      limit = 50,
      offset = 0,
    } = query;

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'catalog',
        'products',
        JSON.stringify({
          storeId: storeId ?? null, // ✅ include storeId in cache key
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

        // ✅ store scope (only this)
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

        // ✅ category filter stays the same
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

        // 2) Stock + price aggregates per product (UNCHANGED)
        const stockPriceRows = await this.db
          .select({
            productId: productVariants.productId,
            stock: sql<number>`COALESCE(SUM(${inventoryItems.available}), 0)`,
            minPrice: sql<string | null>`
            MIN(NULLIF(${productVariants.regularPrice}, 0))
          `,
            maxPrice: sql<string | null>`
            MAX(NULLIF(${productVariants.regularPrice}, 0))
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
          { stock: number; minPrice: number | null; maxPrice: number | null }
        >();

        for (const r of stockPriceRows) {
          stockPriceByProduct.set(r.productId, {
            stock: Number(r.stock ?? 0),
            minPrice: r.minPrice == null ? null : Number(r.minPrice),
            maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
          });
        }

        // 3) Ratings aggregates per product (bounded to page productIds)
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

        // 4) Categories (bounded to page productIds)
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
          };

          const ratings = ratingsByProduct.get(p.id) ?? {
            ratingCount: 0,
            averageRating: 0,
          };

          const min = sp.minPrice;
          const max = sp.maxPrice;

          let priceLabel: string | null = null;
          if (min != null && max != null)
            priceLabel = min === max ? `${min}` : `${min} - ${max}`;
          else if (max != null) priceLabel = `${max}`;
          else if (min != null) priceLabel = `${min}`;

          return {
            id: p.id,
            name: p.name,
            createdAt: p.createdAt,
            status: p.status,
            slug: p.slug,
            imageUrl: p.imageUrl ?? null,

            stock: sp.stock,
            minPrice: min,
            maxPrice: max,
            priceLabel,

            categories: catsByProduct.get(p.id) ?? [],

            ratingCount: ratings.ratingCount,
            averageRating: ratings.averageRating,
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

        // map categoryId -> productCategory row (so we reorder the actual join rows)
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

        // override order on returned product
        (product as any).productCategories = reordered;
      }
    }

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
        // 1) product fields (lean)
        // 1) product fields (lean) + default image url
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

            // ✅ featured image url
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
            and(eq(products.companyId, companyId), eq(products.id, productId)),
          )
          .limit(1)
          .then((rows) => rows[0]);

        if (!product) {
          throw new NotFoundException(
            `Product not found for company ${companyId}`,
          );
        }

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

        // order stable (optional)
        linksRows.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

        const links: any = {
          related: [],
          upsell: [],
          cross_sell: [],
        };

        for (const r of linksRows) {
          const t = r.linkType as ProductLinkType;
          if (t === 'related') links.related.push(r.linkedProductId);
          else if (t === 'upsell') links.upsell.push(r.linkedProductId);
          else if (t === 'cross_sell') links.cross_sell.push(r.linkedProductId);
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description ?? null,
          status: product.status,
          productType: product.productType,
          imageUrl: product.imageUrl ?? null,
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

  async updateProduct(
    companyId: string,
    productId: string,
    dto: UpdateProductDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findProductByIdOrThrow(companyId, productId);

    // slug logic
    let slug = existing.slug;
    if (dto.slug) {
      slug = slugify(dto.slug);
      if (slug !== existing.slug) {
        await this.ensureSlugUnique(companyId, slug, productId);
      }
    }

    const updated = await this.db.transaction(async (tx) => {
      // 1) update product
      const [p] = await tx
        .update(products)
        .set({
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          slug,
          status: dto.status ?? existing.status,
          isGiftCard: dto.isGiftCard ?? existing.isGiftCard,
          productType: dto.productType ?? existing.productType,
          seoTitle: dto.seoTitle ?? existing.seoTitle,
          seoDescription: dto.seoDescription ?? existing.seoDescription,
          metadata: dto.metadata ?? existing.metadata,
          updatedAt: new Date(),
        })
        .where(
          and(eq(products.companyId, companyId), eq(products.id, productId)),
        )
        .returning()
        .execute();

      if (!p) {
        throw new NotFoundException('Product not found');
      }

      if (dto.base64Image) {
        const fileName = `${productId}-default-${Date.now()}.jpg`;
        const url = await this.aws.uploadImageToS3(
          companyId,
          fileName,
          dto.base64Image,
        );

        const [img] = await tx
          .insert(productImages)
          .values({
            companyId,
            productId,
            variantId: null,
            url,
            altText: dto.imageAltText ?? `${existing.name} product image`,
            position: 0,
          })
          .returning()
          .execute();

        await tx
          .update(products)
          .set({ defaultImageId: img.id, updatedAt: new Date() })
          .where(
            and(
              eq(products.companyId, companyId),
              eq(products.id, existing.id),
            ),
          );
      }

      // 2) replace categories if provided
      if (dto.categoryIds) {
        const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));

        await this.categoryService.assertCategoriesBelongToCompany(
          companyId,
          uniqueCategoryIds,
        );

        // wipe existing
        await tx
          .delete(productCategories)
          .where(
            and(
              eq(productCategories.companyId, companyId),
              eq(productCategories.productId, productId),
            ),
          )
          .execute();

        // insert new
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

      // 3) replace links if provided
      if (dto.links) {
        const linksByType = dto.links ?? {};

        // flatten + validate
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

        // wipe all existing links for this product (simple + safe)
        await tx
          .delete(productLinks)
          .where(
            and(
              eq(productLinks.companyId, companyId),
              eq(productLinks.productId, productId),
            ),
          )
          .execute();

        // insert new
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

      return p;
    });

    // bump once after tx
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
          // include when provided
          categoryIds: dto.categoryIds,
          links: dto.links,
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
    categoryId: string,
  ) {
    const res = await this.db.execute(sql`
    WITH RECURSIVE subcats AS (
      SELECT id
      FROM ${categories}
      WHERE company_id = ${companyId}
        AND id = ${categoryId}
        AND deleted_at IS NULL

      UNION ALL

      SELECT c.id
      FROM ${categories} c
      JOIN subcats s ON c.parent_id = s.id
      WHERE c.company_id = ${companyId}
        AND c.deleted_at IS NULL
    )
    SELECT id FROM subcats
  `);

    const ids = (res as any).rows?.map((r: any) => r.id) ?? [categoryId];
    return ids as string[];
  }

  async listCollectionProductsByCategorySlug(
    companyId: string,
    categorySlug: string,
    query: ProductQueryDto,
  ) {
    const { search, status, limit = 12, offset = 0 } = query;
    const effectiveStatus = status ?? 'active';
    const attr = query.attr ?? {};

    // ✅ stable stringify for cache key (sort keys + values)
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
      // A) resolve category slug -> id
      const category = await this.db.query.categories.findFirst({
        where: (c, { and, eq, isNull }) =>
          and(
            eq(c.companyId, companyId),
            eq(c.slug, categorySlug),
            isNull(c.deletedAt),
          ),
        columns: { id: true },
      });
      if (!category) return [];

      // B) leaf vs parent -> categoryIds
      const hasChild = await this.db.query.categories.findFirst({
        where: (c, { and, eq, isNull }) =>
          and(
            eq(c.companyId, companyId),
            eq(c.parentId, category.id),
            isNull(c.deletedAt),
          ),
        columns: { id: true },
      });

      const categoryIds = hasChild
        ? await this.getCategoryAndDescendantIds(companyId, category.id)
        : [category.id];

      // ---- 1) Get paged product ids matching category + search + attributes ----
      const whereSql: any[] = [
        sql`${products.companyId} = ${companyId}`,
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

      // Attribute filters as EXISTS clauses (options/values)
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
      if (productIds.length === 0) return [];

      // ---- 2) Load product graph for those ids (NO variants) ----
      const fullProducts = await this.db.query.products.findMany({
        where: (p, { and, eq, inArray, isNull }) =>
          and(
            eq(p.companyId, companyId),
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

      // Keep original order of ids
      const fullById = new Map(fullProducts.map((p) => [p.id, p]));
      const ordered = productIds
        .map((id) => fullById.get(id))
        .filter(Boolean) as any[];

      // ---- 3) ratings for selected ids ----
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

      // ---- 4) price range per product ----
      const priceRows = await this.db
        .select({
          productId: productVariants.productId,
          minPrice: sql<string | null>`
          MIN(NULLIF(${productVariants.regularPrice}, 0))
        `,
          maxPrice: sql<string | null>`
          MAX(NULLIF(${productVariants.regularPrice}, 0))
        `,
        })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.companyId, companyId),
            inArray(productVariants.productId, productIds),
          ),
        )
        .groupBy(productVariants.productId)
        .execute();

      const priceByProduct = new Map<
        string,
        { minPrice: number; maxPrice: number }
      >();
      for (const r of priceRows) {
        const min = r.minPrice == null ? 0 : Number(r.minPrice);
        const max = r.maxPrice == null ? min : Number(r.maxPrice);
        priceByProduct.set(r.productId, { minPrice: min, maxPrice: max });
      }

      // ---- 5) Map to lightweight list items ----
      return ordered.map((p) => {
        const ratings = ratingsByProduct.get(p.id) ?? {
          rating_count: 0,
          average_rating: 0,
        };
        const price = priceByProduct.get(p.id) ?? { minPrice: 0, maxPrice: 0 };

        return mapProductToCollectionListResponse({
          ...p,
          rating_count: ratings.rating_count,
          average_rating: ratings.average_rating,
          minPrice: price.minPrice,
          maxPrice: price.maxPrice,
        } as any);
      });
    });
  }

  async listProductsGroupedUnderParentCategory(
    companyId: string,
    parentCategoryId: string,
    query: ProductQueryDto,
  ) {
    const { status, search, limit = 8, offset = 0 } = query; // limit per category is usually 8
    const effectiveStatus = status ?? 'active';

    // 1) fetch direct child categories (the buckets)
    const childCats = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(categories)
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.parentId, parentCategoryId),
          sql`${categories.deletedAt} IS NULL`,
        ),
      )
      .orderBy(categories.name)
      .execute();

    if (childCats.length === 0) {
      return []; // parent has no children
    }

    const childCatIds = childCats.map((c) => c.id);

    // 2) pick products for those categories with per-category pagination
    //    row_number partitioned by category, then filter rn between offset+1..offset+limit
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
      // return buckets with empty products
      return childCats.map((c) => ({ category: c, products: [] }));
    }

    const productIds = [...new Set(pairs.map((x) => x.product_id))];

    // 3) fetch base product info + default image (only for selected productIds)
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
      { stock: number; minPrice: number | null; maxPrice: number | null }
    >();
    for (const r of stockPriceRows) {
      spByProduct.set(r.productId, {
        stock: Number(r.stock ?? 0),
        minPrice: r.minPrice == null ? null : Number(r.minPrice),
        maxPrice: r.maxPrice == null ? null : Number(r.maxPrice),
      });
    }

    // 5) aggregates (ratings)
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

    // 6) build grouped response
    const productsByCategory = new Map<string, any[]>();
    for (const { category_id, product_id } of pairs) {
      const b = baseById.get(product_id);
      if (!b) continue;

      const sp = spByProduct.get(product_id) ?? {
        stock: 0,
        minPrice: null,
        maxPrice: null,
      };
      const rt = ratingsByProduct.get(product_id) ?? {
        ratingCount: 0,
        averageRating: 0,
      };

      const productDto = {
        id: b.id,
        name: b.name,
        slug: b.slug,
        imageUrl: b.imageUrl ?? null,
        stock: sp.stock,
        minPrice: sp.minPrice,
        maxPrice: sp.maxPrice,
        averageRating: rt.averageRating,
        ratingCount: rt.ratingCount,
        // you can add priceLabel here if you want
      };

      const list = productsByCategory.get(category_id) ?? [];
      list.push(productDto);
      productsByCategory.set(category_id, list);
    }

    return childCats.map((c) => ({
      category: c,
      products: productsByCategory.get(c.id) ?? [],
    }));
  }

  async listProductsGroupedUnderParentCategorySlug(
    companyId: string,
    parentSlug: string,
    query: ProductQueryDto,
  ) {
    // 0) resolve slug -> parentCategoryId
    const parent = await this.db
      .select({
        id: categories.id,
      })
      .from(categories)
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.slug, parentSlug),
          sql`${categories.deletedAt} IS NULL`,
        ),
      )
      .limit(1)
      .execute()
      .then((r) => r[0]);

    if (!parent?.id) return [];

    // 1) reuse your existing logic
    return this.listProductsGroupedUnderParentCategory(
      companyId,
      parent.id,
      query,
    );
  }
}
