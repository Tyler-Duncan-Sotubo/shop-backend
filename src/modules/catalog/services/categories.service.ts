// src/modules/catalog/services/categories.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  companies,
  products,
  categories,
  productCategories,
  media,
  productImages,
  productVariants,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  AssignCategoriesDto,
} from '../dtos/categories';
import { slugify } from '../utils/slugify';
import { AwsService } from 'src/common/aws/aws.service';
import { defaultId } from 'src/drizzle/id';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly aws: AwsService,
  ) {}

  // ----------------- Helpers -----------------

  async assertCompanyExists(companyId: string) {
    const company = await this.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });

    if (!company) throw new NotFoundException('Company not found');
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

  async findCategoryByIdOrThrow(companyId: string, categoryId: string) {
    const category = await this.db.query.categories.findFirst({
      where: and(
        eq(categories.companyId, companyId),
        eq(categories.id, categoryId),
      ),
    });

    if (!category) {
      throw new NotFoundException(
        `Category not found for company ${companyId}`,
      );
    }
    return category;
  }

  async assertCategoriesBelongToCompany(
    companyId: string,
    categoryIds: string[],
  ) {
    if (!categoryIds.length) return;

    const rows = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.companyId, companyId),
          inArray(categories.id, categoryIds),
        ),
      )
      .execute();

    const found = new Set(rows.map((r) => r.id));
    const missing = categoryIds.filter((id) => !found.has(id));

    if (missing.length > 0) {
      throw new BadRequestException(
        `Some categories do not belong to this company: ${missing.join(', ')}`,
      );
    }
  }

  async assertParentValid(
    companyId: string,
    parentId?: string | null,
    categoryIdBeingUpdated?: string,
  ) {
    if (!parentId) return;

    if (categoryIdBeingUpdated && parentId === categoryIdBeingUpdated) {
      throw new BadRequestException('Category cannot have itself as parent');
    }

    const parent = await this.db.query.categories.findFirst({
      where: and(
        eq(categories.companyId, companyId),
        eq(categories.id, parentId),
        isNull(categories.deletedAt),
      ),
      columns: { id: true },
    });

    if (!parent) throw new BadRequestException('Parent category not found');
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

  private async createMediaFromBase64OrThrow(params: {
    companyId: string;
    storeId: string;
    base64Image: string;
    fileNameHint?: string | null;
    mimeType?: string | null;
    altText?: string | null;
    folder?: string | null; // e.g. "categories"
    tag?: string | null; // e.g. category slug
  }): Promise<{ id: string; url: string }> {
    const { companyId, storeId, base64Image } = params;

    const mimeType = (params.mimeType ?? 'image/jpeg').trim() || 'image/jpeg';

    const safeProvidedName = this.sanitizeFileName(params.fileNameHint);
    const extFromMime = mimeType.startsWith('image/')
      ? `.${mimeType.split('/')[1] || 'jpg'}`
      : '.bin';

    const fileName =
      safeProvidedName && safeProvidedName.includes('.')
        ? safeProvidedName
        : safeProvidedName
          ? `${safeProvidedName}${extFromMime}`
          : `category-${Date.now()}${extFromMime}`;

    // validate base64 + compute metadata
    const normalized = base64Image.includes(',')
      ? base64Image.split(',')[1]
      : base64Image;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(normalized, 'base64');
    } catch {
      throw new BadRequestException('Invalid base64Image');
    }

    const size = buffer.byteLength;

    let width: number | null = null;
    let height: number | null = null;

    if (mimeType.startsWith('image/')) {
      try {
        const sharpMod = await import('sharp');
        const sharpFn: any = (sharpMod as any).default ?? sharpMod;
        const meta = await sharpFn(buffer).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch {
        // non-fatal
      }
    }

    // Upload
    const url = await this.aws.uploadImageToS3(
      companyId,
      fileName,
      base64Image,
    );
    const storageKey = this.extractStorageKeyFromUrl(url);

    const [row] = await this.db
      .insert(media)
      .values({
        id: defaultId(), // optional: drizzle default already handles it; remove if you prefer
        companyId,
        storeId,
        fileName,
        mimeType,
        url,
        storageKey: storageKey ?? null,
        size,
        width,
        height,
        altText: params.altText ?? null,
        folder: params.folder ?? 'categories',
        tag: params.tag ?? null,
      })
      .returning({ id: media.id, url: media.url })
      .execute();

    if (!row) throw new BadRequestException('Failed to create media');
    return row;
  }

  private async assertMediaBelongsToCompanyAndStore(params: {
    companyId: string;
    storeId: string;
    mediaId: string;
  }) {
    const m = await this.db.query.media.findFirst({
      where: (mm, { and, eq, isNull }) =>
        and(
          eq(mm.id, params.mediaId),
          eq(mm.companyId, params.companyId),
          eq(mm.storeId, params.storeId),
          isNull(mm.deletedAt),
        ),
      columns: { id: true },
    });

    if (!m)
      throw new BadRequestException('Invalid mediaId for this store/company');
    return m;
  }

  // ----------------- Read -----------------

  async listCategoriesAdmin(companyId: string, storeId: string) {
    await this.assertCompanyExists(companyId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'categories', 'adminList', storeId],
      async () => {
        const rows = await this.db
          .select({
            id: categories.id,
            name: categories.name,
            slug: categories.slug,
            parentId: categories.parentId,
            position: categories.position,
            isActive: categories.isActive,
            productCount: sql<number>`COUNT(DISTINCT ${productCategories.productId})`,
            imageUrl: media.url,
          })
          .from(categories)
          .leftJoin(
            productCategories,
            and(
              eq(productCategories.companyId, categories.companyId),
              eq(productCategories.categoryId, categories.id),
            ),
          )
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
              isNull(categories.deletedAt),
            ),
          )
          .groupBy(
            categories.id,
            categories.name,
            categories.slug,
            categories.parentId,
            categories.position,
            categories.isActive,
            media.url,
          )
          .orderBy(categories.position, categories.name)
          .execute();

        return rows.map((r) => ({
          ...r,
          productCount: Number(r.productCount ?? 0),
        }));
      },
    );
  }

  async getCategoryAdmin(
    companyId: string,
    storeId: string,
    categoryId: string,
  ) {
    await this.assertCompanyExists(companyId);

    const row = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        parentId: categories.parentId,
        description: categories.description,
        afterContentHtml: categories.afterContentHtml,
        metaTitle: categories.metaTitle,
        metaDescription: categories.metaDescription,
        position: categories.position,
        isActive: categories.isActive,
        createdAt: categories.createdAt,
        updatedAt: categories.updatedAt,

        imageMediaId: (categories as any).imageMediaId,
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
          eq(categories.id, categoryId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1)
      .execute()
      .then((r) => r[0]);

    if (!row) throw new NotFoundException('Category not found');
    return row;
  }

  async listCategoryProductsAdmin(
    companyId: string,
    storeId: string,
    categoryId: string,
    opts?: { limit?: number; offset?: number; search?: string },
  ) {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    const search = opts?.search?.trim();

    const whereClauses: any[] = [
      eq(productCategories.companyId, companyId),
      eq(productCategories.categoryId, categoryId),

      eq(products.companyId, companyId),
      eq(products.storeId, storeId),
      sql`${products.deletedAt} IS NULL`,
    ];

    if (search) whereClauses.push(ilike(products.name, `%${search}%`));

    return this.db
      .select({
        id: products.id,
        name: products.name,
        status: products.status,

        // ✅ default product image
        imageUrl: productImages.url,

        // ✅ used for drag order (after you add these cols)
        pinned: (productCategories as any).pinned,
        position: (productCategories as any).position,
      })
      .from(productCategories)
      .innerJoin(
        products,
        and(
          eq(products.companyId, productCategories.companyId),
          eq(products.id, productCategories.productId),
        ),
      )
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, products.companyId),
          eq(productImages.id, products.defaultImageId),
          sql`${productImages.deletedAt} IS NULL`,
        ),
      )
      .where(and(...whereClauses))
      .orderBy(
        // ✅ merch order first
        sql`${(productCategories as any).pinned} DESC`,
        sql`${(productCategories as any).position} ASC`,

        // ✅ stable fallback
        sql`${products.createdAt} DESC`,
      )
      .limit(limit)
      .offset(offset)
      .execute();
  }

  async getCategoryAdminWithProducts(
    companyId: string,
    storeId: string,
    categoryId: string,
    opts?: { limit?: number; offset?: number; search?: string },
  ) {
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;
    const search = opts?.search?.trim();

    await this.assertCompanyExists(companyId);

    // ✅ category details + category image via media join (inside getCategoryAdmin)
    const category = await this.getCategoryAdmin(
      companyId,
      storeId,
      categoryId,
    );

    // ✅ total count (no images needed here)
    const whereCount: any[] = [
      eq(productCategories.companyId, companyId),
      eq(productCategories.categoryId, categoryId),
      eq(products.companyId, companyId),
      eq(products.storeId, storeId),
      sql`${products.deletedAt} IS NULL`,
    ];
    if (search) whereCount.push(ilike(products.name, `%${search}%`));

    const [{ count }] = await this.db
      .select({ count: sql<number>`COUNT(DISTINCT ${products.id})` })
      .from(productCategories)
      .innerJoin(
        products,
        and(
          eq(products.companyId, productCategories.companyId),
          eq(products.id, productCategories.productId),
        ),
      )
      .where(and(...whereCount))
      .execute();

    const total = Number(count ?? 0);

    // ✅ products list + product default image via productImages join
    const productsList = await this.listCategoryProductsAdmin(
      companyId,
      storeId,
      categoryId,
      { limit, offset, search },
    );

    return {
      category,
      products: productsList,
      total,
      limit,
      offset,
    };
  }

  async reorderCategoryProducts(
    companyId: string,
    categoryId: string,
    items: { productId: string; position: number; pinned?: boolean }[],
  ) {
    if (!items.length) return { success: true };

    await this.db.transaction(async (tx) => {
      for (const it of items) {
        await tx
          .update(productCategories)
          .set({
            position: it.position,
            ...(it.pinned !== undefined ? { pinned: it.pinned } : {}),
          } as any)
          .where(
            and(
              eq(productCategories.companyId, companyId),
              eq(productCategories.categoryId, categoryId),
              eq(productCategories.productId, it.productId),
            ),
          )
          .execute();
      }
    });

    await this.cache.bumpCompanyVersion(companyId);
    return { success: true };
  }

  async getCategories(companyId: string, storeId?: string | null) {
    await this.assertCompanyExists(companyId);

    // your existing behavior
    if (!storeId) return [];

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'categories', storeId],
      async () => {
        // include image url via join (optional)
        return this.db
          .select({
            id: categories.id,
            companyId: categories.companyId,
            storeId: categories.storeId,
            parentId: categories.parentId,
            name: categories.name,
            slug: categories.slug,
            description: categories.description,
            afterContentHtml: categories.afterContentHtml,
            metaTitle: categories.metaTitle,
            metaDescription: categories.metaDescription,
            position: categories.position,
            isActive: categories.isActive,
            createdAt: categories.createdAt,
            updatedAt: categories.updatedAt,

            imageMediaId: (categories as any).imageMediaId, // if typed in schema, remove any-cast
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
              isNull(categories.deletedAt),
            ),
          )
          .execute();
      },
    );
  }

  async getCategoriesWithLimit(
    companyId: string,
    storeId?: string | null,
    limit?: number,
  ) {
    await this.assertCompanyExists(companyId);

    // keep existing behavior
    if (!storeId) return [];

    // return this.cache.getOrSetVersioned(
    //   companyId,
    //   ['catalog', 'categories', storeId, 'limit', (limit ?? 'all').toString()],
    //   async () => {
    const baseQuery = this.db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        imageUrl: media.url,
        imageAltText: media.altText,

        // ✅ include parentId
        parentId: categories.parentId,

        // ✅ include hasChildren (store + company scoped, ignores deleted)
        hasChildren: sql<boolean>`
            exists (
              select 1
              from ${categories} as child
              where
                child.company_id = ${companyId}
                and child.store_id = ${storeId}
                and child.parent_id = ${categories.id}
                and child.deleted_at is null
            )
          `.as('hasChildren'),
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
          isNull(categories.deletedAt),
        ),
      )
      .orderBy(categories.position);

    if (typeof limit === 'number') {
      return baseQuery.limit(limit).execute();
    }

    console.log(baseQuery.toSQL().sql); // debug

    return baseQuery.execute();
    //   },
    // );
  }

  // ----------------- Create -----------------
  async createCategory(
    companyId: string,
    dto: CreateCategoryDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertCompanyExists(companyId);

    if (!dto.storeId) {
      throw new BadRequestException('storeId is required to create categories');
    }

    if (dto.parentId) {
      await this.assertParentValid(companyId, dto.parentId);
    }

    const slug =
      dto.slug && dto.slug.trim().length > 0
        ? slugify(dto.slug)
        : slugify(dto.name);

    // Ensure slug unique in company + store scope
    const existing = await this.db.query.categories.findFirst({
      where: and(
        eq(categories.companyId, companyId),
        eq(categories.slug, slug),
        eq(categories.storeId, dto.storeId),
        isNull(categories.deletedAt),
      ),
      columns: { id: true },
    });

    if (existing) throw new BadRequestException('Category slug must be unique');

    const created = await this.db.transaction(async (tx) => {
      const [category] = await tx
        .insert(categories)
        .values({
          companyId,
          storeId: dto.storeId,
          name: dto.name,
          slug,
          description: dto.description ?? null,
          afterContentHtml: (dto as any).afterContentHtml ?? null,
          metaTitle: (dto as any).metaTitle ?? null,
          metaDescription: (dto as any).metaDescription ?? null,
          parentId: dto.parentId ?? null,
          isActive: dto.isActive ?? true,
        })
        .returning()
        .execute();

      // Image assignment: choose existing media OR upload base64
      const imageMediaId = (dto as any).imageMediaId as string | undefined;
      const base64Image = (dto as any).base64Image as string | undefined;

      if (imageMediaId && base64Image) {
        throw new BadRequestException(
          'Provide either imageMediaId or base64Image, not both.',
        );
      }

      let finalMediaId: string | null = null;

      if (imageMediaId) {
        await this.assertMediaBelongsToCompanyAndStore({
          companyId,
          storeId: dto.storeId,
          mediaId: imageMediaId,
        });
        finalMediaId = imageMediaId;
      } else if (base64Image) {
        const m = await this.createMediaFromBase64OrThrow({
          companyId,
          storeId: dto.storeId,
          base64Image,
          mimeType: dto.imageMimeType ?? null,
          fileNameHint: dto.imageFileName ?? null,
          altText: dto.imageAltText ?? `${dto.name} category image`,
          folder: 'categories',
          tag: slug,
        });
        finalMediaId = m.id;
      }

      if (finalMediaId) {
        const [updated] = await tx
          .update(categories)
          .set({
            ...(categories.imageMediaId
              ? { imageMediaId: finalMediaId }
              : ({} as any)),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(categories.companyId, companyId),
              eq(categories.id, category.id),
            ),
          )
          .returning()
          .execute();

        return updated ?? category;
      }

      return category;
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'create',
        entity: 'category',
        entityId: created.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created category',
        changes: {
          companyId,
          storeId: created.storeId,
          name: created.name,
          slug: created.slug,
          parentId: created.parentId,
        },
      });
    }

    return created;
  }

  // ----------------- Update -----------------

  async updateCategory(
    companyId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);

    if (!existing.storeId) {
      // You currently design categories to always be store-scoped
      throw new BadRequestException('Category storeId is missing');
    }

    if (dto.parentId !== undefined) {
      await this.assertParentValid(companyId, dto.parentId, categoryId);
    }

    const slug =
      dto.slug !== undefined
        ? slugify(dto.slug || existing.slug)
        : existing.slug;

    // If slug changes, ensure unique in same company + store scope
    if (dto.slug !== undefined && slug !== existing.slug) {
      const conflict = await this.db.query.categories.findFirst({
        where: (c, { and, eq, isNull }) =>
          and(
            eq(c.companyId, companyId),
            eq(c.storeId, existing.storeId!),
            eq(c.slug, slug),
            isNull(c.deletedAt),
          ),
        columns: { id: true },
      });

      if (conflict && conflict.id !== categoryId) {
        throw new BadRequestException('Category slug must be unique');
      }
    }

    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(categories)
        .set({
          name: dto.name ?? existing.name,
          slug,
          description: dto.description ?? existing.description,

          afterContentHtml:
            (dto as any).afterContentHtml !== undefined
              ? (dto as any).afterContentHtml
              : existing.afterContentHtml,

          metaTitle:
            (dto as any).metaTitle !== undefined
              ? (dto as any).metaTitle
              : existing.metaTitle,
          metaDescription:
            (dto as any).metaDescription !== undefined
              ? (dto as any).metaDescription
              : existing.metaDescription,

          parentId:
            dto.parentId === undefined ? existing.parentId : dto.parentId,
          isActive:
            dto.isActive === undefined ? existing.isActive : dto.isActive,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(categories.companyId, companyId),
            eq(categories.id, categoryId),
          ),
        )
        .returning()
        .execute();

      if (!row) throw new NotFoundException('Category not found');

      // Image assignment: existing media OR upload base64 OR remove
      const imageMediaId = dto.imageMediaId as string | undefined;
      const base64Image = dto.base64Image as string | undefined;
      const removeImage = dto.removeImage as boolean | undefined;

      if (imageMediaId && base64Image) {
        throw new BadRequestException(
          'Provide either imageMediaId or base64Image, not both.',
        );
      }

      if (removeImage === true) {
        const [row2] = await tx
          .update(categories)
          .set({
            imageMediaId: null as any,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(categories.companyId, companyId),
              eq(categories.id, categoryId),
            ),
          )
          .returning()
          .execute();

        return row2 ?? row;
      }

      if (imageMediaId) {
        await this.assertMediaBelongsToCompanyAndStore({
          companyId,
          storeId: existing.storeId!,
          mediaId: imageMediaId,
        });

        const [row2] = await tx
          .update(categories)
          .set({
            imageMediaId: imageMediaId as any,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(categories.companyId, companyId),
              eq(categories.id, categoryId),
            ),
          )
          .returning()
          .execute();

        return row2 ?? row;
      }

      if (base64Image) {
        const m = await this.createMediaFromBase64OrThrow({
          companyId,
          storeId: existing.storeId!,
          base64Image,
          mimeType: dto.imageMimeType ?? null,
          fileNameHint: dto.imageFileName ?? null,
          altText: dto.imageAltText ?? `${row.name} category image`,
          folder: 'categories',
          tag: slug,
        });

        const [row2] = await tx
          .update(categories)
          .set({
            imageMediaId: m.id as any,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(categories.companyId, companyId),
              eq(categories.id, categoryId),
            ),
          )
          .returning()
          .execute();

        return row2 ?? row;
      }

      return row;
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'category',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated category',
        changes: { before: existing, after: updated },
      });
    }

    return updated;
  }

  // ----------------- Delete -----------------

  async deleteCategory(
    companyId: string,
    categoryId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);

    // Prevent delete if it has children
    const children = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.parentId, categoryId),
          isNull(categories.deletedAt),
        ),
      )
      .limit(1)
      .execute();

    if (children.length > 0) {
      throw new BadRequestException(
        'Cannot delete category: it has child categories. Delete or reassign children first.',
      );
    }

    const [deleted] = await this.db
      .delete(categories)
      .where(
        and(eq(categories.companyId, companyId), eq(categories.id, categoryId)),
      )
      .returning()
      .execute();

    if (!deleted) throw new NotFoundException('Category not found');

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'delete',
        entity: 'category',
        entityId: categoryId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted category',
        changes: {
          companyId,
          storeId: existing.storeId,
          name: existing.name,
          slug: existing.slug,
        },
      });
    }

    return { success: true };
  }

  // ----------------- Product ↔ Categories mapping -----------------

  async getProductCategories(companyId: string, productId: string) {
    await this.assertProductBelongsToCompany(companyId, productId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'product', productId, 'categories'],
      async () => {
        return this.db
          .select()
          .from(productCategories)
          .where(
            and(
              eq(productCategories.companyId, companyId),
              eq(productCategories.productId, productId),
            ),
          )
          .execute();
      },
    );
  }

  async assignCategoriesToProduct(
    companyId: string,
    productId: string,
    dto: AssignCategoriesDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertProductBelongsToCompany(companyId, productId);

    const uniqueCategoryIds = Array.from(new Set(dto.categoryIds ?? []));
    await this.assertCategoriesBelongToCompany(companyId, uniqueCategoryIds);

    await this.db
      .delete(productCategories)
      .where(
        and(
          eq(productCategories.companyId, companyId),
          eq(productCategories.productId, productId),
        ),
      )
      .execute();

    let inserted: (typeof productCategories.$inferSelect)[] = [];
    if (uniqueCategoryIds.length) {
      inserted = await this.db
        .insert(productCategories)
        .values(
          uniqueCategoryIds.map((categoryId) => ({
            companyId,
            productId,
            categoryId,
          })),
        )
        .returning()
        .execute();
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'product_categories',
        entityId: productId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated categories assigned to product',
        changes: {
          companyId,
          productId,
          categoryIds: uniqueCategoryIds,
        },
      });
    }

    return inserted;
  }

  // in CategoriesService (or CategoryProductsService if you split mapping)
  async syncSalesCategoryForProduct(params: {
    companyId: string;
    productId: string;
    storeId?: string;
    salesSlug?: string;
    salesName?: string;
  }) {
    const companyId = params.companyId;
    const productId = params.productId;
    const salesSlug = (params.salesSlug ?? 'sale').trim() || 'sale';
    const salesName = (params.salesName ?? 'Sale').trim() || 'Sale';

    // 0) ensure product exists + get storeId
    const product = await this.db.query.products.findFirst({
      where: and(eq(products.companyId, companyId), eq(products.id, productId)),
      columns: { id: true, storeId: true },
    });

    console.log('Syncing sales category for product', { companyId, productId });

    if (!product) throw new BadRequestException('Product not found');

    const storeId = params.storeId ?? product.storeId;
    if (!storeId) {
      throw new BadRequestException(
        'storeId is required to sync sales category',
      );
    }

    // 1) ✅ reliable "hasSale" check using Drizzle schema columns
    const hasSaleRow = await this.db
      .select({ one: sql<number>`1` })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.productId, productId),
          isNull(productVariants.deletedAt),
          sql`${productVariants.salePrice} IS NOT NULL`,
          sql`${productVariants.salePrice} > 0`,
        ),
      )
      .limit(1)
      .execute();

    const shouldBeOnSale = hasSaleRow.length > 0;

    // 2) find/create Sales category
    let salesCategory = await this.db.query.categories.findFirst({
      where: (c, { and, eq, isNull }) =>
        and(
          eq(c.companyId, companyId),
          eq(c.storeId, storeId),
          eq(c.slug, salesSlug),
          isNull(c.deletedAt),
        ),
      columns: { id: true },
    });

    if (!salesCategory) {
      const [created] = await this.db
        .insert(categories)
        .values({
          companyId,
          storeId,
          name: salesName,
          slug: salesSlug,
          isActive: true,
          description: null,
          parentId: null,
        })
        .returning({ id: categories.id })
        .execute();

      salesCategory = created;
    }

    // 3) is product already assigned?
    const link = await this.db.query.productCategories.findFirst({
      where: (pc, { and, eq }) =>
        and(
          eq(pc.companyId, companyId),
          eq(pc.productId, productId),
          eq(pc.categoryId, salesCategory!.id),
        ),
      columns: { categoryId: true },
    });

    let changed = false;

    // 4) add/remove mapping
    if (shouldBeOnSale) {
      if (!link) {
        await this.db.insert(productCategories).values({
          companyId,
          productId,
          categoryId: salesCategory.id,
        });
        changed = true;
      }
    } else {
      if (link) {
        await this.db
          .delete(productCategories)
          .where(
            and(
              eq(productCategories.companyId, companyId),
              eq(productCategories.productId, productId),
              eq(productCategories.categoryId, salesCategory.id),
            ),
          )
          .execute();
        changed = true;
      }
    }

    if (changed) {
      await this.cache.bumpCompanyVersion(companyId);
    }

    return { salesCategoryId: salesCategory.id, shouldBeOnSale, changed };
  }
}
