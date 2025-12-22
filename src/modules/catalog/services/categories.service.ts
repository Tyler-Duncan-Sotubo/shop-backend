// src/modules/catalog/services/categories.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import {
  companies,
  products,
  categories,
  productCategories,
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

@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
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
      ),
    });

    if (!parent) {
      throw new BadRequestException('Parent category not found');
    }

    // NOTE: We are *not* doing deep cycle detection here.
    // If you want to prevent parent-child loops entirely,
    // you’d add a check to ensure parent is not a descendant of this category.
  }

  // ----------------- Categories CRUD -----------------

  async getCategories(companyId: string, storeId?: string | null) {
    await this.assertCompanyExists(companyId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'categories', storeId ?? 'company-default'],
      async () => {
        if (!storeId) {
          return this.db
            .select()
            .from(categories)
            .where(
              and(
                eq(categories.companyId, companyId),
                isNull(categories.storeId),
              ),
            )
            .execute();
        }

        const storeRows = await this.db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.companyId, companyId),
              eq(categories.storeId, storeId),
            ),
          )
          .execute();

        if (storeRows.length > 0) return storeRows;

        return this.db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.companyId, companyId),
              isNull(categories.storeId),
            ),
          )
          .execute();
      },
    );
  }

  async createCategory(
    companyId: string,
    dto: CreateCategoryDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertCompanyExists(companyId);

    if (dto.parentId) {
      await this.assertParentValid(companyId, dto.parentId);
    }

    const slug =
      dto.slug && dto.slug.trim().length > 0
        ? slugify(dto.slug)
        : slugify(dto.name);

    // Ensure slug is unique within the company
    const existing = await this.db.query.categories.findFirst({
      where: and(
        eq(categories.companyId, companyId),
        eq(categories.slug, slug),
        dto.storeId
          ? eq(categories.storeId, dto.storeId)
          : isNull(categories.storeId),
      ),
    });

    if (existing) {
      throw new BadRequestException('Category slug must be unique');
    }

    const [category] = await this.db
      .insert(categories)
      .values({
        companyId,
        storeId: dto.storeId ?? null,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        isActive: dto.isActive ?? true,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'create',
        entity: 'category',
        entityId: category.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created category',
        changes: {
          companyId,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
        },
      });
    }

    return category;
  }

  async updateCategory(
    companyId: string,
    categoryId: string,
    dto: UpdateCategoryDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);

    if (dto.parentId !== undefined) {
      await this.assertParentValid(companyId, dto.parentId, categoryId);
    }

    const slug =
      dto.slug !== undefined
        ? slugify(dto.slug || existing.slug)
        : existing.slug;

    const [updated] = await this.db
      .update(categories)
      .set({
        name: dto.name ?? existing.name,
        slug,
        description: dto.description ?? existing.description,
        parentId: dto.parentId === undefined ? existing.parentId : dto.parentId,
        isActive: dto.isActive === undefined ? existing.isActive : dto.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(eq(categories.companyId, companyId), eq(categories.id, categoryId)),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Category not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'category',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated category',
        changes: {
          before: existing,
          after: updated,
        },
      });
    }

    return updated;
  }

  async deleteCategory(
    companyId: string,
    categoryId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findCategoryByIdOrThrow(companyId, categoryId);

    // ✅ Prevent delete if it has children
    const children = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.companyId, companyId),
          eq(categories.parentId, categoryId),
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

    // Delete existing mappings
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
}
