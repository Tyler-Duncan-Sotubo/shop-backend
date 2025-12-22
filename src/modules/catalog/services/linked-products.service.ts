import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  companies,
  products,
  productLinks,
  ProductLinkType,
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

  // ----------------- Get Linked Products -----------------

  async getLinkedProducts(
    companyId: string,
    productId: string,
    linkType?: ProductLinkType,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'product', productId, 'links', linkType ?? 'all'],
      async () => {
        const where = [
          eq(productLinks.companyId, companyId),
          eq(productLinks.productId, productId),
        ];

        if (linkType) {
          where.push(eq(productLinks.linkType, linkType));
        }

        const links = await this.db
          .select()
          .from(productLinks)
          .where(and(...where))
          .execute();

        return links;
      },
    );
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
