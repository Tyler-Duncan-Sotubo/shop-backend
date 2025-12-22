import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { taxes } from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  private tags(companyId: string) {
    return [
      `company:${companyId}:billing`,
      `company:${companyId}:billing:taxes`,
    ];
  }

  private cacheKeyList(active?: boolean, storeId?: string | null) {
    return [
      'billing',
      'taxes',
      'list',
      storeId ?? 'company-default',
      active === undefined ? 'all' : active ? 'active' : 'inactive',
    ];
  }

  async create(user: User, dto: CreateTaxDto, ip?: string) {
    const companyId = user.companyId;

    if (dto.rateBps < 0) throw new BadRequestException('rateBps must be >= 0');
    if (!dto.name?.trim()) throw new BadRequestException('name is required');

    return this.db.transaction(async (tx) => {
      // if isDefault: unset other defaults first
      if (dto.isDefault) {
        await tx
          .update(taxes)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(taxes.companyId, companyId))
          .execute();
      }

      let created;
      try {
        const [row] = await tx
          .insert(taxes)
          .values({
            companyId,
            name: dto.name.trim(),
            code: dto.code ?? null,
            rateBps: dto.rateBps,
            isInclusive: dto.isInclusive ?? false,
            isDefault: dto.isDefault ?? false,
            isActive: dto.isActive ?? true,
            storeId: dto.storeId ?? null,
          })
          .returning()
          .execute();
        created = row;
      } catch (e: any) {
        // uniqueIndex(taxes_company_name_uq)
        throw new BadRequestException('Tax name already exists', { cause: e });
      }

      await this.auditService.logAction({
        action: 'create',
        entity: 'tax',
        entityId: created.id,
        userId: user.id,
        details: 'Created tax',
        ipAddress: ip,
        changes: {
          companyId,
          taxId: created.id,
          name: created.name,
          code: created.code,
          rateBps: created.rateBps,
          isInclusive: created.isInclusive,
          isDefault: created.isDefault,
          isActive: created.isActive,
        },
      });

      // bump version once per write
      await this.cache.bumpCompanyVersion(companyId);
      return created;
    });
  }

  async list(
    companyId: string,
    opts?: { active?: boolean; storeId?: string | null },
  ) {
    const active = opts?.active;
    const storeId = opts?.storeId ?? null;

    return this.cache.getOrSetVersioned(
      companyId,
      this.cacheKeyList(active, storeId), // ✅ MUST include storeId
      async () => {
        // -------------------------
        // Company default (no storeId)
        // -------------------------
        if (!storeId) {
          const whereClause =
            active === undefined
              ? and(eq(taxes.companyId, companyId), isNull(taxes.storeId))
              : and(
                  eq(taxes.companyId, companyId),
                  isNull(taxes.storeId),
                  eq(taxes.isActive, active),
                );

          return this.db.select().from(taxes).where(whereClause).execute();
        }

        // -------------------------
        // Store taxes first
        // -------------------------
        const storeWhere =
          active === undefined
            ? and(eq(taxes.companyId, companyId), eq(taxes.storeId, storeId))
            : and(
                eq(taxes.companyId, companyId),
                eq(taxes.storeId, storeId),
                eq(taxes.isActive, active),
              );

        const storeRows = await this.db
          .select()
          .from(taxes)
          .where(storeWhere)
          .execute();

        if (storeRows.length > 0) return storeRows;

        // -------------------------
        // Fallback to company default
        // -------------------------
        const fallbackWhere =
          active === undefined
            ? and(eq(taxes.companyId, companyId), isNull(taxes.storeId))
            : and(
                eq(taxes.companyId, companyId),
                isNull(taxes.storeId),
                eq(taxes.isActive, active),
              );

        return this.db.select().from(taxes).where(fallbackWhere).execute();
      },
      { tags: this.tags(companyId) },
    );
  }

  async getById(companyId: string, taxId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['taxes', 'byId', taxId],
      async () => {
        const [row] = await this.db
          .select()
          .from(taxes)
          .where(and(eq(taxes.companyId, companyId), eq(taxes.id, taxId)))
          .limit(1)
          .execute();

        if (!row) throw new NotFoundException('Tax not found');
        return row;
      },
      { tags: this.tags(companyId) },
    );
  }

  async update(user: User, taxId: string, dto: UpdateTaxDto, ip?: string) {
    const companyId = user.companyId;

    // ensure exists (also helps with cache warming)
    const before = await this.getById(companyId, taxId);

    return this.db.transaction(async (tx) => {
      // If setting as default, unset others
      if (dto.isDefault === true) {
        await tx
          .update(taxes)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(taxes.companyId, companyId))
          .execute();
      }

      // if isDefault explicitly false, that's ok (no extra work)
      // if isActive false, also force isDefault false to keep invariant clean
      const forceUnsetDefault = dto.isActive === false;

      const [updated] = await tx
        .update(taxes)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.code !== undefined ? { code: dto.code } : {}),
          ...(dto.rateBps !== undefined ? { rateBps: dto.rateBps } : {}),
          ...(dto.isInclusive !== undefined
            ? { isInclusive: dto.isInclusive }
            : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(forceUnsetDefault ? { isDefault: false } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(taxes.companyId, companyId), eq(taxes.id, taxId)))
        .returning()
        .execute();

      if (!updated) throw new NotFoundException('Tax not found');

      await this.auditService.logAction({
        action: 'update',
        entity: 'tax',
        entityId: updated.id,
        userId: user.id,
        details: 'Updated tax',
        ipAddress: ip,
        changes: {
          companyId,
          taxId: updated.id,
          before,
          after: updated,
        },
      });

      await this.cache.bumpCompanyVersion(companyId);
      return updated;
    });
  }

  /**
   * Recommended: deactivate instead of delete (safe for invoices history).
   */
  async deactivate(user: User, taxId: string, ip?: string) {
    const companyId = user.companyId;

    const before = await this.getById(companyId, taxId);

    const [updated] = await this.db
      .update(taxes)
      .set({
        isActive: false,
        isDefault: false,
        updatedAt: new Date(),
      })
      .where(and(eq(taxes.companyId, companyId), eq(taxes.id, taxId)))
      .returning()
      .execute();

    if (!updated) throw new NotFoundException('Tax not found');

    await this.auditService.logAction({
      action: 'delete', // or "deactivate" if your audit supports it
      entity: 'tax',
      entityId: updated.id,
      userId: user.id,
      details: 'Deactivated tax',
      ipAddress: ip,
      changes: {
        companyId,
        taxId: updated.id,
        before,
        after: updated,
      },
    });

    await this.cache.bumpCompanyVersion(companyId);
    return updated;
  }

  async setDefault(user: User, taxId: string, ip?: string) {
    const companyId = user.companyId;

    // ensure exists
    await this.getById(companyId, taxId);

    return this.db.transaction(async (tx) => {
      await tx
        .update(taxes)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(taxes.companyId, companyId))
        .execute();

      const [updated] = await tx
        .update(taxes)
        .set({ isDefault: true, isActive: true, updatedAt: new Date() })
        .where(and(eq(taxes.companyId, companyId), eq(taxes.id, taxId)))
        .returning()
        .execute();

      if (!updated) throw new NotFoundException('Tax not found');

      await this.auditService.logAction({
        action: 'update',
        entity: 'tax',
        entityId: updated.id,
        userId: user.id,
        details: 'Set default tax',
        ipAddress: ip,
        changes: {
          companyId,
          taxId: updated.id,
          isDefault: true,
        },
      });

      await this.cache.bumpCompanyVersion(companyId);
      return updated;
    });
  }
}
