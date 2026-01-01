import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gt, ilike, or, sql } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  companies,
  inventoryItems,
  productImages,
  products,
  productVariants,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  CreateVariantDto,
  UpdateVariantDto,
  VariantQueryDto,
} from '../dtos/variants';
import {
  generateVariantCombinations,
  ProductOptionWithValues,
} from '../utils/option-combinations';
import { ImagesService } from './images.service';
import { InventoryStockService } from 'src/modules/commerce/inventory/services/inventory-stock.service';
import { StoreVariantQueryDto } from '../dtos/variants/store-vairants.dto';

@Injectable()
export class VariantsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly imagesService: ImagesService,
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

  async assertProductBelongsToCompany(companyId: string, productId: string) {
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.companyId, companyId), eq(products.id, productId)),
    });

    if (!product) {
      throw new NotFoundException(`Product not found for company ${companyId}`);
    }

    return product;
  }

  async findVariantByIdOrThrow(companyId: string, variantId: string) {
    const variant = await this.db.query.productVariants.findFirst({
      where: and(
        eq(productVariants.companyId, companyId),
        eq(productVariants.id, variantId),
      ),
    });

    if (!variant) {
      throw new NotFoundException(`Variant not found for company ${companyId}`);
    }

    return variant;
  }

  async ensureSkuUnique(
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

  // ----------------- Create -----------------

  async createVariant(
    companyId: string,
    productId: string,
    dto: CreateVariantDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertCompanyExists(companyId);
    await this.assertProductBelongsToCompany(companyId, productId);
    await this.ensureSkuUnique(companyId, dto.sku);

    const [created] = await this.db
      .insert(productVariants)
      .values({
        companyId,
        productId,

        title: dto.title ?? null,
        sku: dto.sku ?? null,
        barcode: dto.barcode ?? null,

        option1: dto.option1 ?? null,
        option2: dto.option2 ?? null,
        option3: dto.option3 ?? null,

        isActive: dto.isActive ?? true,

        // Pricing
        regularPrice: dto.regularPrice,
        salePrice: dto.salePrice ?? null,
        currency: dto.currency ?? 'NGN',

        // Dimensions
        weight: dto.weight ?? null,
        length: dto.length ?? null,
        width: dto.width ?? null,
        height: dto.height ?? null,

        metadata: dto.metadata ?? {},
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'product_variant',
        entityId: created.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created product variant',
        changes: {
          companyId,
          productId,
          variantId: created.id,
          sku: created.sku,
          regularPrice: created.regularPrice,
          salePrice: created.salePrice,
          currency: created.currency,
        },
      });
    }

    return created;
  }

  // ----------------- List / Query -----------------
  async listVariants(companyId: string, query: VariantQueryDto) {
    const { productId, search, isActive, limit = 50, offset = 0 } = query;

    const normalizedSearch = (search ?? '').trim();

    const cacheKey = [
      'products',
      'variants',
      'list',
      'product',
      productId ?? 'any',
      'active',
      typeof isActive === 'boolean' ? String(isActive) : 'any',
      'search',
      normalizedSearch || 'none',
      'limit',
      String(limit),
      'offset',
      String(offset),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const where: any[] = [eq(productVariants.companyId, companyId)];

      if (productId) {
        where.push(eq(productVariants.productId, productId));
      }

      if (typeof isActive === 'boolean') {
        where.push(eq(productVariants.isActive, isActive));
      }

      if (normalizedSearch) {
        // sku OR title
        const q = `%${normalizedSearch}%`;
        where.push(
          or(ilike(productVariants.sku, q), ilike(productVariants.title, q)),
        );
      }

      const rows = await this.db
        .select({
          // ✅ all variant columns
          variant: productVariants,

          // ✅ single variant image (because you enforce 1 image per variant)
          image: {
            id: productImages.id,
            url: productImages.url,
            altText: productImages.altText,
            position: productImages.position,
          },

          // ✅ inventory (adjust table/column names to your schema)
          inventory: {
            stockQuantity: sql<number>`COALESCE(${inventoryItems.available}, 0)`,
            lowStockThreshold: sql<number>`COALESCE(${inventoryItems.safetyStock}, 0)`,
          },
        })
        .from(productVariants)
        .leftJoin(
          productImages,
          and(
            eq(productImages.companyId, productVariants.companyId),
            eq(productImages.variantId, productVariants.id),
          ),
        )
        .leftJoin(
          inventoryItems,
          and(
            eq(inventoryItems.companyId, productVariants.companyId),
            eq(inventoryItems.productVariantId, productVariants.id),
          ),
        )
        .where(and(...where))
        .limit(limit)
        .offset(offset)
        .execute();

      return rows;
    });
  }

  async listStoreVariantsForCombobox(
    companyId: string,
    query: StoreVariantQueryDto,
  ) {
    const { storeId, search, isActive, limit = 50, offset = 0 } = query;
    const normalizedSearch = (search ?? '').trim();

    const cacheKey = [
      'products',
      'variants',
      'store-combobox',
      'store',
      storeId,
      'inStock',
      'true',
      'active',
      typeof isActive === 'boolean' ? String(isActive) : 'any',
      'search',
      normalizedSearch || 'none',
      'limit',
      String(limit),
      'offset',
      String(offset),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      const where: any[] = [
        eq(productVariants.companyId, companyId),
        eq(productVariants.storeId, storeId),
      ];

      if (typeof isActive === 'boolean') {
        where.push(eq(productVariants.isActive, isActive));
      }

      if (normalizedSearch) {
        const q = `%${normalizedSearch}%`;
        where.push(
          or(ilike(productVariants.sku, q), ilike(productVariants.title, q)),
        );
      }

      // Replace with real price column if you have one:
      const suggestedUnitPriceExpr = (productVariants as any).price
        ? sql<number>`COALESCE(${(productVariants as any).price}, 0)`
        : sql<number | null>`NULL`;

      // total available per variant (could be multiple inventory rows)
      const availableExpr = sql<number>`COALESCE(SUM(${inventoryItems.available}), 0)`;

      const rows = await this.db
        .select({
          id: productVariants.id,
          title: productVariants.title,
          sku: productVariants.sku,

          productName: products.name,
          imageUrl: productImages.url,

          suggestedUnitPrice: suggestedUnitPriceExpr,
          available: availableExpr,
        })
        .from(productVariants)

        // ✅ only variants that exist in inventoryItems
        .innerJoin(
          inventoryItems,
          and(
            eq(inventoryItems.companyId, productVariants.companyId),
            eq(inventoryItems.productVariantId, productVariants.id),
            // if inventoryItems has storeId, filter here too:
            // eq(inventoryItems.storeId, storeId),
          ),
        )

        .leftJoin(
          products,
          and(
            eq(products.companyId, productVariants.companyId),
            eq(products.id, productVariants.productId),
          ),
        )
        .leftJoin(
          productImages,
          and(
            eq(productImages.companyId, productVariants.companyId),
            eq(productImages.variantId, productVariants.id),
          ),
        )
        .where(and(...where))
        .groupBy(
          productVariants.id,
          productVariants.title,
          productVariants.sku,
          products.name,
          productImages.url,
          // if suggestedUnitPriceExpr references a real column, groupBy may be needed depending on DB
          // (if it’s a column, add it here)
        )

        // ✅ only keep in-stock variants
        .having(gt(availableExpr, 0))

        .limit(limit)
        .offset(offset)
        .execute();

      return rows.map((r) => ({
        id: r.id,
        title: r.title,
        sku: r.sku ?? null,
        productName: r.productName ?? null,
        imageUrl: r.imageUrl ?? null,
        suggestedUnitPrice: r.suggestedUnitPrice ?? null,
        available: Number(r.available ?? 0),
        label: `${r.productName ?? 'Product'} • ${r.title}${r.sku ? ` • ${r.sku}` : ''} • ${Number(r.available ?? 0)}`,
      }));
    });
  }

  async getVariantById(companyId: string, variantId: string) {
    return this.findVariantByIdOrThrow(companyId, variantId);
  }

  // ----------------- Update -----------------

  async updateVariant(
    companyId: string,
    variantId: string,
    dto: UpdateVariantDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findVariantByIdOrThrow(companyId, variantId);
    if (dto.sku && dto.sku !== existing.sku) {
      await this.ensureSkuUnique(companyId, dto.sku, variantId);
    }

    // metadata merge (and store low stock threshold here if you want)
    const nextMetadata: Record<string, any> = {
      ...(existing.metadata ?? {}),
      ...(dto.metadata ?? {}),
    };

    if (dto.lowStockThreshold !== undefined) {
      nextMetadata.low_stock_threshold = dto.lowStockThreshold;
    }
    const shouldCreateImage = !!dto.base64Image?.trim();
    const shouldUpdateStock = dto.stockQuantity !== undefined;

    const result = await this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(productVariants)
        .set({
          title: dto.title ?? existing.title,
          sku: dto.sku ?? existing.sku,
          barcode: dto.barcode ?? existing.barcode,

          option1: dto.option1 ?? existing.option1,
          option2: dto.option2 ?? existing.option2,
          option3: dto.option3 ?? existing.option3,

          regularPrice:
            dto.regularPrice === undefined
              ? existing.regularPrice
              : dto.regularPrice,
          salePrice:
            dto.salePrice === undefined ? existing.salePrice : dto.salePrice,

          weight: dto.weight ?? existing.weight,
          length: dto.length ?? existing.length,
          width: dto.width ?? existing.width,
          height: dto.height ?? existing.height,

          metadata: nextMetadata,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.id, variantId),
          ),
        )
        .returning()
        .execute();

      if (!updated) throw new NotFoundException('Variant not found');

      console.log('filename', dto.imageFileName);

      // 2) image (use your ImagesService.createImage)
      let createdImage: any = null;
      if (shouldCreateImage) {
        createdImage = await this.imagesService.createImage(
          companyId,
          existing.productId,
          {
            base64Image: dto.base64Image!,
            altText: dto.imageAltText,
            variantId: updated.id,
            fileName: dto.imageFileName,
            mimeType: dto.imageMimeType,
          },
          user,
          ip,
          { tx, skipCacheBump: true, skipAudit: true },
        );
      }

      // 3) stock (use your InventoryService.setInventoryLevel)
      let inventoryRow: any = null;
      if (shouldUpdateStock) {
        inventoryRow = await this.inventoryService.setInventoryLevel(
          companyId,
          updated.id,
          dto.stockQuantity ?? 0,
          dto.safetyStock ?? 0,
          user,
          ip,
          { tx, skipCacheBump: true, skipAudit: true },
        );
      }

      return { updated, createdImage, inventoryRow };
    });

    // bump cache once
    await this.cache.bumpCompanyVersion(companyId);

    // single audit once
    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product_variant',
        entityId: result.updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated product variant (fields + optional image + stock)',
        changes: {
          companyId,
          productId: existing.productId,
          variantId: result.updated.id,
          imageCreated: !!result.createdImage,
          stockUpdated: !!result.inventoryRow,
        },
      });
    }

    return result.updated;
  }

  // ----------------- Delete (soft) -----------------

  async deleteVariant(
    companyId: string,
    variantId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findVariantByIdOrThrow(companyId, variantId);

    const [deleted] = await this.db
      .update(productVariants)
      .set({
        deletedAt: new Date(),
        isActive: false,
      })
      .where(
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, variantId),
        ),
      )
      .returning()
      .execute();

    if (!deleted) {
      throw new NotFoundException('Variant not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'product_variant',
        entityId: variantId,
        userId: user.id,
        ipAddress: ip,
        details: 'Soft deleted product variant',
        changes: {
          companyId,
          productId: existing.productId,
          variantId,
          sku: existing.sku,
        },
      });
    }

    return { success: true };
  }

  // ----------------- Generate Variants from Options -----------------
  async generateVariantsForProduct(
    companyId: string,
    productId: string,
    user?: User,
    ip?: string,
  ) {
    // Ensure product exists for this company
    const product = await this.assertProductBelongsToCompany(
      companyId,
      productId,
    );

    // 1. Load options + values for this product
    const opts = await this.db.query.productOptions.findMany({
      where: (fields, { and, eq }) =>
        and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
      with: {
        values: true,
      },
    });

    // Filter out options with no values
    const optionsWithValues: ProductOptionWithValues[] = opts
      .filter((opt) => opt.values && opt.values.length > 0)
      .map((opt) => ({
        id: opt.id,
        name: opt.name,
        position: opt.position,
        values: opt.values.map((v) => ({
          id: v.id,
          value: v.value,
        })),
      }));

    if (optionsWithValues.length === 0) {
      // No options => nothing to generate
      return [];
    }

    // 2. Generate all theoretical combinations
    const combinations = generateVariantCombinations(optionsWithValues);

    if (combinations.length === 0) {
      return [];
    }

    // 3. Load existing variants to avoid duplicates
    const existingVariants = await this.db.query.productVariants.findMany({
      where: (fields, { and, eq }) =>
        and(eq(fields.companyId, companyId), eq(fields.productId, productId)),
    });

    const makeKey = (
      opt1?: string | null,
      opt2?: string | null,
      opt3?: string | null,
    ) => `${opt1 ?? ''}||${opt2 ?? ''}||${opt3 ?? ''}`;

    const existingKeys = new Set(
      existingVariants.map((v) => makeKey(v.option1, v.option2, v.option3)),
    );

    // 4. Filter combinations to only those that don't exist yet
    const newCombinations = combinations.filter((combo) => {
      const key = makeKey(combo.option1, combo.option2, combo.option3);
      return !existingKeys.has(key);
    });

    if (newCombinations.length === 0) {
      // Everything already exists
      return [];
    }

    // 5. Insert missing variants
    const inserted = await this.db
      .insert(productVariants)
      .values(
        newCombinations.map((combo) => ({
          companyId,
          productId,
          storeId: product.storeId,
          regularPrice: '0', // default price; user can update later

          title: combo.title,
          // NOTE: SKU/barcode not set here; you can fill them later or generate
          sku: null,
          barcode: null,

          option1: combo.option1 ?? null,
          option2: combo.option2 ?? null,
          option3: combo.option3 ?? null,

          isActive: true,

          weight: null,
          length: null,
          width: null,
          height: null,

          metadata: {},
        })),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'product_variants',
        entityId: productId,
        userId: user.id,
        ipAddress: ip,
        details: 'Generated variants from options',
        changes: {
          companyId,
          productId,
          generatedCount: inserted.length,
        },
      });
    }

    return inserted;
  }
}
