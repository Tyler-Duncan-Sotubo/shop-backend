import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';

import { carriers } from 'src/drizzle/schema';
import { CreateCarrierDto } from '../dto';

@Injectable()
export class ShippingCarriersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  async listCarriers(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'carriers', 'v1'],
      async () => {
        return this.db
          .select()
          .from(carriers)
          .where(eq(carriers.companyId, companyId))
          .orderBy(desc(carriers.createdAt))
          .execute();
      },
    );
  }

  async createCarrier(
    companyId: string,
    dto: CreateCarrierDto,
    user?: User,
    ip?: string,
  ) {
    const [row] = await this.db
      .insert(carriers)
      .values({
        companyId,
        providerKey: dto.providerKey,
        name: dto.name,
        isActive: dto.isActive ?? true,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'carrier',
        entityId: row.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created carrier',
        changes: {
          companyId,
          carrierId: row.id,
          providerKey: dto.providerKey,
          name: dto.name,
        },
      });
    }

    return row;
  }

  async updateCarrier(
    companyId: string,
    carrierId: string,
    patch: Partial<CreateCarrierDto>,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.carriers.findFirst({
      where: and(eq(carriers.companyId, companyId), eq(carriers.id, carrierId)),
    });
    if (!existing) throw new NotFoundException('Carrier not found');

    const [updated] = await this.db
      .update(carriers)
      .set({
        providerKey: patch.providerKey ?? existing.providerKey,
        name: patch.name ?? existing.name,
        isActive: patch.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(carriers.companyId, companyId), eq(carriers.id, carrierId)))
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'carrier',
        entityId: carrierId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated carrier',
        changes: { companyId, carrierId, before: existing, after: updated },
      });
    }

    return updated;
  }

  async deleteCarrier(
    companyId: string,
    carrierId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.carriers.findFirst({
      where: and(eq(carriers.companyId, companyId), eq(carriers.id, carrierId)),
    });
    if (!existing) throw new NotFoundException('Carrier not found');

    await this.db
      .delete(carriers)
      .where(and(eq(carriers.companyId, companyId), eq(carriers.id, carrierId)))
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'carrier',
        entityId: carrierId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted carrier',
        changes: { companyId, carrierId, removed: existing },
      });
    }

    return { ok: true };
  }
}
