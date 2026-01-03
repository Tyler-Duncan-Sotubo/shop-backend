import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  companies,
  products,
  productLinks,
  ProductLinkType,
  productImages,
  productVariants,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';

@Injectable()
export class LinkedProductsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
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

  async assertProductBelongsToCompany(companyId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.companyId, companyId), eq(products.id, productId)),
    });

    if (!product) {
      throw new NotFoundException(`Product not found for company ${companyId}`);
    }

    return product;
  }

  async assertProductsBelongToCompany(companyId: string, productIds: string[]) {
    if (!productIds.length) return;

    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(
        and(
          eq(products.companyId, companyId),
          inArray(products.id, productIds),
        ),
      )
      .execute();

    const foundIds = new Set(rows.map((r) => r.id));
    const missing = productIds.filter((id) => !foundIds.has(id));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Some linked products do not belong to this company: ${missing.join(
          ', ',
        )}`,
      );
    }
  }

  private async listLinkedProductsStorefrontLite(
    companyId: string,
    productIds: string[],
  ) {
    if (!productIds.length) return [];

    // 1) Base product info
    const productsPage = await this.db
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
        ),
      )
      .where(
        and(
          eq(products.companyId, companyId),
          inArray(products.id, productIds),
          eq(products.status, 'active'),
          sql`${products.deletedAt} IS NULL`,
        ),
      )
      .execute();

    if (!productsPage.length) return [];

    const ids = productsPage.map((p) => p.id);

    // 2) Price aggregation only
    const priceRows = await this.db
      .select({
        productId: productVariants.productId,

        minRegular: sql<number | null>`
          MIN(NULLIF(${productVariants.regularPrice}, 0))
        `,
        maxRegular: sql<number | null>`
          MAX(NULLIF(${productVariants.regularPrice}, 0))
        `,

        minSale: sql<number | null>`
          MIN(
            CASE
              WHEN NULLIF(${productVariants.salePrice}, 0) IS NOT NULL
               AND ${productVariants.salePrice} < ${productVariants.regularPrice}
              THEN ${productVariants.salePrice}
              ELSE NULL
            END
          )
        `,
        maxSale: sql<number | null>`
          MAX(
            CASE
              WHEN NULLIF(${productVariants.salePrice}, 0) IS NOT NULL
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
          inArray(productVariants.productId, ids),
        ),
      )
      .groupBy(productVariants.productId)
      .execute();

    const prices = new Map<
      string,
      {
        minRegular: number | null;
        maxRegular: number | null;
        minSale: number | null;
        maxSale: number | null;
      }
    >();

    for (const r of priceRows) {
      prices.set(r.productId, {
        minRegular: r.minRegular,
        maxRegular: r.maxRegular,
        minSale: r.minSale,
        maxSale: r.maxSale,
      });
    }

    const rangeLabel = (min: number | null, max: number | null) => {
      if (min == null && max == null) return '';
      if (min != null && max != null)
        return min === max ? `${min}` : `${min} - ${max}`;
      return `${min ?? max}`;
    };

    // 3) Merge minimal storefront response
    return productsPage.map((p) => {
      const pr = prices.get(p.id) ?? {
        minRegular: null,
        maxRegular: null,
        minSale: null,
        maxSale: null,
      };

      const regularLabel = rangeLabel(pr.minRegular, pr.maxRegular);
      const saleLabel = rangeLabel(pr.minSale, pr.maxSale);

      const onSale =
        pr.minSale != null &&
        pr.minRegular != null &&
        pr.minSale < pr.minRegular;

      const price_html =
        onSale && regularLabel && saleLabel
          ? `<del>${regularLabel}</del> <ins>${saleLabel}</ins>`
          : regularLabel;

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        image: p.imageUrl ?? null,
        price_html,
        on_sale: onSale,
      };
    });
  }

  // ----------------- Get Linked Products -----------------

  async getLinkedProducts(
    companyId: string,
    productId: string,
    linkType?: ProductLinkType,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    const links = await this.db
      .select({
        linkedProductId: productLinks.linkedProductId,
        sortOrder: productLinks.position,
      })
      .from(productLinks)
      .where(
        and(
          eq(productLinks.companyId, companyId),
          eq(productLinks.productId, productId),
          linkType ? eq(productLinks.linkType, linkType) : undefined,
        ),
      )
      .orderBy(productLinks.position)
      .execute();

    const linkedIds = links.map((l) => l.linkedProductId);

    const products = await this.listLinkedProductsStorefrontLite(
      companyId,
      linkedIds,
    );

    // preserve link ordering
    const byId = new Map(products.map((p) => [p.id, p]));
    return linkedIds.map((id) => byId.get(id)).filter(Boolean);
  }

  // ----------------- Replace Linked Products for a Type -----------------

  /**
   * Replace all linked products of a given type for a product.
   *
   * Similar to updateStoreLocations: wipe existing rows of that type,
   * then insert the new set (with ordering).
   */
  async setLinkedProducts(
    companyId: string,
    productId: string,
    linkType: ProductLinkType,
    linkedProductIds: string[],
    user?: User,
    ip?: string,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    // Prevent self-linking
    const cleanedIds = Array.from(
      new Set(linkedProductIds.filter((id) => id !== productId)),
    );

    await this.assertProductsBelongToCompany(companyId, cleanedIds);

    // Delete previous links of this type
    await this.db
      .delete(productLinks)
      .where(
        and(
          eq(productLinks.companyId, companyId),
          eq(productLinks.productId, productId),
          eq(productLinks.linkType, linkType),
        ),
      )
      .execute();

    let inserted: (typeof productLinks.$inferSelect)[] = [];
    if (cleanedIds.length) {
      inserted = await this.db
        .insert(productLinks)
        .values(
          cleanedIds.map((linkedProductId, index) => ({
            companyId,
            productId,
            linkedProductId,
            linkType,
            position: index + 1,
          })),
        )
        .returning()
        .execute();
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product_links',
        entityId: productId,
        userId: user.id,
        ipAddress: ip,
        details: `Updated linked products (${linkType})`,
        changes: {
          companyId,
          productId,
          linkType,
          linkedProductIds: cleanedIds,
        },
      });
    }

    return inserted;
  }

  // ----------------- Remove a Single Link -----------------

  async removeLink(
    companyId: string,
    productId: string,
    linkId: string,
    user?: User,
    ip?: string,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    const [deleted] = await this.db
      .delete(productLinks)
      .where(
        and(
          eq(productLinks.companyId, companyId),
          eq(productLinks.productId, productId),
          eq(productLinks.id, linkId),
        ),
      )
      .returning()
      .execute();

    if (!deleted) {
      throw new NotFoundException('Linked product not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'product_links',
        entityId: linkId,
        userId: user.id,
        ipAddress: ip,
        details: 'Removed linked product',
        changes: {
          companyId,
          productId,
          linkedProductId: deleted.linkedProductId,
          linkType: deleted.linkType,
        },
      });
    }

    return { success: true };
  }
}
