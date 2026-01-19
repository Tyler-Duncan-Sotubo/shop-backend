import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import {
  companies,
  products,
  productOptions,
  productOptionValues,
  productVariants,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  CreateOptionDto,
  CreateOptionValueDto,
  UpdateOptionDto,
  UpdateOptionValueDto,
} from '../dtos/options';

@Injectable()
export class OptionsService {
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

  async findOptionByIdOrThrow(companyId: string, optionId: string) {
    const option = await this.db.query.productOptions.findFirst({
      where: and(
        eq(productOptions.companyId, companyId),
        eq(productOptions.id, optionId),
      ),
    });

    if (!option) {
      throw new NotFoundException(
        `Product option not found for company ${companyId}`,
      );
    }

    return option;
  }

  async findOptionValueByIdOrThrow(companyId: string, valueId: string) {
    const value = await this.db.query.productOptionValues.findFirst({
      where: and(
        eq(productOptionValues.companyId, companyId),
        eq(productOptionValues.id, valueId),
      ),
    });

    if (!value) {
      throw new NotFoundException(
        `Product option value not found for company ${companyId}`,
      );
    }

    return value;
  }

  // ----------------- Options CRUD -----------------

  async getOptionsWithValues(companyId: string, productId: string) {
    await this.assertProductBelongsToCompany(companyId, productId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['catalog', 'product', productId, 'options'],
      async () => {
        return this.db.query.productOptions.findMany({
          where: (fields, { and, eq }) =>
            and(
              eq(fields.companyId, companyId),
              eq(fields.productId, productId),
            ),
          with: {
            values: true,
          },
        });
      },
    );
  }

  async createOption(
    companyId: string,
    productId: string,
    dto: CreateOptionDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertCompanyExists(companyId);
    const product = await this.assertProductBelongsToCompany(
      companyId,
      productId,
    );

    const [option] = await this.db
      .insert(productOptions)
      .values({
        companyId,
        productId,
        name: dto.name,
        position: dto.position ?? 1,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'product_option',
        entityId: option.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created product option',
        changes: {
          companyId,
          productId: product.id,
          optionId: option.id,
          name: option.name,
          position: option.position,
        },
      });
    }

    return option;
  }

  async updateOption(
    companyId: string,
    optionId: string,
    dto: UpdateOptionDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findOptionByIdOrThrow(companyId, optionId);

    const [updated] = await this.db
      .update(productOptions)
      .set({
        name: dto.name ?? existing.name,
        position: dto.position ?? existing.position,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productOptions.companyId, companyId),
          eq(productOptions.id, optionId),
        ),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Product option not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product_option',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated product option',
        changes: {
          companyId,
          productId: existing.productId,
          optionId: updated.id,
          before: existing,
          after: updated,
        },
      });
    }

    return updated;
  }

  async deleteOption(
    companyId: string,
    optionId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findOptionByIdOrThrow(companyId, optionId);

    await this.db.transaction(async (tx) => {
      // 1) Delete variants generated with this option
      const columnSql =
        existing.position === 1
          ? sql`${productVariants.option1}`
          : existing.position === 2
            ? sql`${productVariants.option2}`
            : sql`${productVariants.option3}`;

      await tx
        .delete(productVariants)
        .where(
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.productId, existing.productId),
            sql`${columnSql} is not null`,
          ),
        )
        .execute();

      // 2) Delete option (FK cascade deletes option values)
      const [deleted] = await tx
        .delete(productOptions)
        .where(
          and(
            eq(productOptions.companyId, companyId),
            eq(productOptions.id, optionId),
          ),
        )
        .returning()
        .execute();

      if (!deleted) {
        throw new NotFoundException('Product option not found');
      }
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'product_option',
        entityId: optionId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted product option (and disabled affected variants)',
        changes: {
          companyId,
          productId: existing.productId,
          optionId,
          name: existing.name,
          position: existing.position,
        },
      });
    }

    return { success: true, disabledVariantsForPosition: existing.position };
  }

  // ----------------- Option Values CRUD -----------------

  async createOptionValue(
    companyId: string,
    optionId: string,
    dto: CreateOptionValueDto,
    user?: User,
    ip?: string,
  ) {
    const option = await this.findOptionByIdOrThrow(companyId, optionId);

    const [value] = await this.db
      .insert(productOptionValues)
      .values({
        companyId,
        productOptionId: optionId,
        value: dto.value,
        position: dto.position ?? 1,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'product_option_value',
        entityId: value.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created product option value',
        changes: {
          companyId,
          productId: option.productId,
          optionId,
          valueId: value.id,
          value: value.value,
          position: value.position,
        },
      });
    }

    return value;
  }

  async updateOptionValue(
    companyId: string,
    valueId: string,
    dto: UpdateOptionValueDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findOptionValueByIdOrThrow(companyId, valueId);

    const [updated] = await this.db
      .update(productOptionValues)
      .set({
        value: dto.value ?? existing.value,
        position: dto.position ?? existing.position,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(productOptionValues.companyId, companyId),
          eq(productOptionValues.id, valueId),
        ),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Product option value not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'product_option_value',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated product option value',
        changes: {
          companyId,
          optionId: existing.productOptionId,
          valueId: updated.id,
          before: existing,
          after: updated,
        },
      });
    }

    return updated;
  }

  async deleteOptionValue(
    companyId: string,
    valueId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findOptionValueByIdOrThrow(companyId, valueId);

    const [deleted] = await this.db
      .delete(productOptionValues)
      .where(
        and(
          eq(productOptionValues.companyId, companyId),
          eq(productOptionValues.id, valueId),
        ),
      )
      .returning()
      .execute();

    if (!deleted) {
      throw new NotFoundException('Product option value not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'product_option_value',
        entityId: valueId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted product option value',
        changes: {
          companyId,
          optionId: existing.productOptionId,
          valueId,
          value: existing.value,
        },
      });
    }

    return { success: true };
  }
}
