import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, desc, isNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';

import {
  shippingRates,
  shippingRateTiers,
  shippingZones,
  carriers,
} from 'src/drizzle/schema';

import {
  CreateRateDto,
  UpdateRateDto,
  UpsertRateTierDto,
  QuoteShippingDto,
} from '../dto';
import { ShippingZonesService } from './shipping-zones.service';

type Money = string;

@Injectable()
export class ShippingRatesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly zonesService: ShippingZonesService,
  ) {}

  private toNumber(v: unknown): number | null {
    if (v == null) return null;
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    return Number.isFinite(n) ? n : null;
  }

  private kgToGrams(v: unknown): number | null {
    const kg = this.toNumber(v);
    if (kg == null) return null;
    return Math.round(kg * 1000);
  }

  async listRates(
    companyId: string,
    opts?: { zoneId?: string; storeId?: string },
  ) {
    const zoneId = opts?.zoneId;
    const storeId = opts?.storeId;

    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'rates', 'v1', zoneId ?? 'all', storeId ?? 'all'],
      async () => {
        const base = and(
          eq(shippingRates.companyId, companyId),
          // if zoneId provided, constrain rates to that zone
          ...(zoneId ? [eq(shippingRates.zoneId, zoneId)] : []),
        );

        // If no storeId, keep existing behavior (no join needed)
        if (!storeId) {
          const rates = await this.db
            .select()
            .from(shippingRates)
            .where(base as any)
            .orderBy(desc(shippingRates.priority))
            .execute();
          console.log('Rates without storeId:', rates);
          return rates;
        }

        const rates = await this.db
          .select({
            id: shippingRates.id,
            zoneId: shippingRates.zoneId,
            name: shippingRates.name,
            flatAmount: shippingRates.flatAmount,
            calc: shippingRates.calc,
            isDefault: shippingRates.isDefault,
            isActive: shippingRates.isActive,
            priority: shippingRates.priority,
            type: shippingRates.type,
          })
          .from(shippingRates)
          .innerJoin(shippingZones, eq(shippingZones.id, shippingRates.zoneId))
          .where(
            and(
              base,
              eq(shippingZones.companyId, companyId),
              eq(shippingZones.storeId, storeId),
            ) as any,
          )
          .orderBy(desc(shippingRates.priority))
          .execute();

        return rates;
      },
    );
  }

  async createRate(
    companyId: string,
    dto: CreateRateDto,
    user?: User,
    ip?: string,
  ) {
    // validate zone exists
    const zone = await this.db.query.shippingZones.findFirst({
      where: and(
        eq(shippingZones.companyId, companyId),
        eq(shippingZones.id, dto.zoneId),
      ),
    });
    if (!zone) throw new BadRequestException('Zone not found');

    // Duplicate name check within the same zone
    const existingRate = await this.db.query.shippingRates.findFirst({
      where: and(
        eq(shippingRates.companyId, companyId),
        eq(shippingRates.zoneId, dto.zoneId),
        eq(shippingRates.name, dto.name),
      ),
    });
    if (existingRate) {
      throw new BadRequestException(
        `A shipping rate with the name '${dto.name}' already exists in this zone.`,
      );
    }

    // validate carrier if provided
    if (dto.carrierId) {
      const c = await this.db.query.carriers.findFirst({
        where: and(
          eq(carriers.companyId, companyId),
          eq(carriers.id, dto.carrierId),
        ),
      });
      if (!c) throw new BadRequestException('Carrier not found');
    }

    // if setting as default, enforce one default per zone (carrierId must be null in our convention)
    if (dto.isDefault) {
      if (dto.carrierId)
        throw new BadRequestException(
          'Default rate should not have a carrierId',
        );

      await this.db
        .update(shippingRates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(shippingRates.companyId, companyId),
            eq(shippingRates.zoneId, dto.zoneId),
            isNull(shippingRates.carrierId),
          ),
        )
        .execute();
    }

    const [rate] = await this.db
      .insert(shippingRates)
      .values({
        companyId,
        zoneId: dto.zoneId,
        carrierId: dto.carrierId ?? null,
        name: dto.name,
        calc: dto.calc ?? ('flat' as any),
        flatAmount: dto.flatAmount ?? null,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
        minDeliveryDays: dto.minDeliveryDays ?? null,
        maxDeliveryDays: dto.maxDeliveryDays ?? null,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'shipping_rate',
        entityId: rate.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created shipping rate',
        changes: { companyId, rateId: rate.id, ...dto },
      });
    }

    return rate;
  }

  async updateRate(
    companyId: string,
    rateId: string,
    dto: UpdateRateDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingRates.findFirst({
      where: and(
        eq(shippingRates.companyId, companyId),
        eq(shippingRates.id, rateId),
      ),
    });
    if (!existing) throw new NotFoundException('Rate not found');

    // validate carrier if provided (or null allowed)
    if (dto.carrierId && typeof dto.carrierId === 'string') {
      const c = await this.db.query.carriers.findFirst({
        where: and(
          eq(carriers.companyId, companyId),
          eq(carriers.id, dto.carrierId),
        ),
      });
      if (!c) throw new BadRequestException('Carrier not found');
    }

    // enforce default semantics
    if (dto.isDefault === true) {
      if (dto.carrierId && dto.carrierId !== null) {
        throw new BadRequestException(
          'Default rate should not have a carrierId',
        );
      }
      await this.db
        .update(shippingRates)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(shippingRates.companyId, companyId),
            eq(shippingRates.zoneId, existing.zoneId),
            isNull(shippingRates.carrierId),
          ),
        )
        .execute();
    }

    const [updated] = await this.db
      .update(shippingRates)
      .set({
        name: dto.name ?? existing.name,
        carrierId:
          dto.carrierId === undefined ? existing.carrierId : dto.carrierId,
        calc: (dto.calc ?? existing.calc) as any,
        flatAmount:
          dto.flatAmount === undefined ? existing.flatAmount : dto.flatAmount,
        isDefault: dto.isDefault ?? existing.isDefault,
        isActive: dto.isActive ?? existing.isActive,
        priority: dto.priority ?? existing.priority,
        minDeliveryDays:
          dto.minDeliveryDays === undefined
            ? existing.minDeliveryDays
            : dto.minDeliveryDays,
        maxDeliveryDays:
          dto.maxDeliveryDays === undefined
            ? existing.maxDeliveryDays
            : dto.maxDeliveryDays,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shippingRates.companyId, companyId),
          eq(shippingRates.id, rateId),
        ),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'shipping_rate',
        entityId: rateId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated shipping rate',
        changes: { companyId, rateId, before: existing, after: updated },
      });
    }

    return updated;
  }

  async deleteRate(
    companyId: string,
    rateId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingRates.findFirst({
      where: and(
        eq(shippingRates.companyId, companyId),
        eq(shippingRates.id, rateId),
      ),
    });
    if (!existing) throw new NotFoundException('Rate not found');

    await this.db
      .delete(shippingRates)
      .where(
        and(
          eq(shippingRates.companyId, companyId),
          eq(shippingRates.id, rateId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'shipping_rate',
        entityId: rateId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted shipping rate',
        changes: { companyId, rateId, removed: existing },
      });
    }

    return { ok: true };
  }

  // -----------------------
  // Tiers
  // -----------------------
  async listRateTiers(companyId: string, rateId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'rate-tiers', 'v1', rateId],
      async () => {
        return this.db
          .select()
          .from(shippingRateTiers)
          .where(
            and(
              eq(shippingRateTiers.companyId, companyId),
              eq(shippingRateTiers.rateId, rateId),
            ),
          )
          .orderBy(desc(shippingRateTiers.priority))
          .execute();
      },
    );
  }

  async upsertRateTier(
    companyId: string,
    dto: UpsertRateTierDto,
    user?: User,
    ip?: string,
  ) {
    const rate = await this.db.query.shippingRates.findFirst({
      where: and(
        eq(shippingRates.companyId, companyId),
        eq(shippingRates.id, dto.rateId),
      ),
    });
    if (!rate) throw new BadRequestException('Rate not found');

    // minimal validation: for weight calc, require min/max weight
    if ((rate.calc as string) === 'weight') {
      if (dto.minWeightGrams == null || dto.maxWeightGrams == null) {
        throw new BadRequestException(
          'Weight tiers require minWeightGrams and maxWeightGrams',
        );
      }
    }

    const [row] = await this.db
      .insert(shippingRateTiers)
      .values({
        companyId,
        rateId: dto.rateId,
        minWeightGrams: this.kgToGrams(dto.minWeightGrams),
        maxWeightGrams: this.kgToGrams(dto.maxWeightGrams),
        minSubtotal: dto.minSubtotal ?? null,
        maxSubtotal: dto.maxSubtotal ?? null,
        amount: dto.amount,
        priority: dto.priority ?? 0,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'shipping_rate_tier',
        entityId: row.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created shipping rate tier',
        changes: { companyId, ...dto, tierId: row.id },
      });
    }

    return row;
  }

  async updateRateTier(
    companyId: string,
    tierId: string,
    patch: Partial<UpsertRateTierDto>,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingRateTiers.findFirst({
      where: and(
        eq(shippingRateTiers.companyId, companyId),
        eq(shippingRateTiers.id, tierId),
      ),
    });
    if (!existing) throw new NotFoundException('Tier not found');

    // Optional but recommended: if patch includes rateId, validate it exists & belongs to company
    if (patch.rateId) {
      const rate = await this.db.query.shippingRates.findFirst({
        where: and(
          eq(shippingRates.companyId, companyId),
          eq(shippingRates.id, patch.rateId),
        ),
      });
      if (!rate) throw new BadRequestException('Rate not found');

      // Optional: enforce this only for weight-based rates
      if ((rate.calc as string) !== 'weight') {
        throw new BadRequestException(
          'Tiers can only be used with weight rates',
        );
      }
    } else {
      // If rateId not provided, still ensure the existing rate is weight-based (optional safety)
      const rate = await this.db.query.shippingRates.findFirst({
        where: and(
          eq(shippingRates.companyId, companyId),
          eq(shippingRates.id, existing.rateId),
        ),
      });
      if (!rate) throw new BadRequestException('Rate not found');
      if ((rate.calc as string) !== 'weight') {
        throw new BadRequestException(
          'Tiers can only be used with weight rates',
        );
      }
    }

    // Basic validation for weight tier fields
    // (Keep this minimal; your DTO/class-validator should handle stricter rules if present)
    const nextMin =
      patch.minWeightGrams === undefined
        ? existing.minWeightGrams
        : this.kgToGrams(patch.minWeightGrams);

    const nextMax =
      patch.maxWeightGrams === undefined
        ? existing.maxWeightGrams
        : this.kgToGrams(patch.maxWeightGrams);

    if (nextMin == null || nextMax == null) {
      throw new BadRequestException(
        'Weight tiers require minWeightGrams and maxWeightGrams',
      );
    }
    if (nextMin < 0 || nextMax < 0) {
      throw new BadRequestException('Weights must not be less than 0');
    }
    if (nextMin > nextMax) {
      throw new BadRequestException('minWeightGrams must be <= maxWeightGrams');
    }

    const [updated] = await this.db
      .update(shippingRateTiers)
      .set({
        // allow moving tier to another rate (optional)
        rateId: patch.rateId ?? existing.rateId,

        minWeightGrams: nextMin,
        maxWeightGrams: nextMax,

        minSubtotal:
          patch.minSubtotal === undefined
            ? existing.minSubtotal
            : patch.minSubtotal,
        maxSubtotal:
          patch.maxSubtotal === undefined
            ? existing.maxSubtotal
            : patch.maxSubtotal,

        amount: patch.amount ?? existing.amount,
        priority: patch.priority ?? existing.priority,
      })
      .where(
        and(
          eq(shippingRateTiers.companyId, companyId),
          eq(shippingRateTiers.id, tierId),
        ),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'shipping_rate_tier',
        entityId: tierId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated shipping rate tier',
        changes: { companyId, tierId, before: existing, after: updated },
      });
    }

    return updated;
  }

  async deleteRateTier(
    companyId: string,
    tierId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingRateTiers.findFirst({
      where: and(
        eq(shippingRateTiers.companyId, companyId),
        eq(shippingRateTiers.id, tierId),
      ),
    });
    if (!existing) throw new NotFoundException('Tier not found');

    await this.db
      .delete(shippingRateTiers)
      .where(
        and(
          eq(shippingRateTiers.companyId, companyId),
          eq(shippingRateTiers.id, tierId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'shipping_rate_tier',
        entityId: tierId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted shipping rate tier',
        changes: { companyId, removed: existing },
      });
    }

    return { ok: true };
  }

  // -----------------------
  // Quoting (used by Cart totals engine)
  // -----------------------
  async quote(companyId: string, dto: QuoteShippingDto) {
    const zone = await this.zonesService.resolveZone(
      companyId,
      dto.storeId,
      dto.countryCode,
      dto.state,
      dto.area,
    );
    if (!zone) return { zone: null, rate: null, amount: '0' as Money };

    const rate = await this.pickBestRate(
      companyId,
      zone.id,
      dto.carrierId ?? null,
    );
    if (!rate) return { zone, rate: null, amount: '0' as Money };

    const amount = await this.computeRateAmount(
      companyId,
      rate.id,
      rate.calc as string,
      dto.totalWeightGrams ?? 0,
    );
    return { zone, rate, amount };
  }

  private async pickBestRate(
    companyId: string,
    zoneId: string,
    carrierId: string | null,
  ) {
    const baseWhere = and(
      eq(shippingRates.companyId, companyId),
      eq(shippingRates.zoneId, zoneId),
      eq(shippingRates.isActive, true),
    );

    if (carrierId) {
      const r = await this.db.query.shippingRates.findFirst({
        where: and(baseWhere, eq(shippingRates.carrierId, carrierId)),
      });
      if (r) return r;
    }

    // initial/default rate convention: carrierId NULL + isDefault true
    const d = await this.db.query.shippingRates.findFirst({
      where: and(
        baseWhere,
        isNull(shippingRates.carrierId),
        eq(shippingRates.isDefault, true),
      ),
    });
    if (d) return d;

    // fallback by priority
    return this.db.query.shippingRates.findFirst({
      where: baseWhere,
      orderBy: (t, { desc }) => [desc(t.priority)],
    });
  }

  private async computeRateAmount(
    companyId: string,
    rateId: string,
    calc: string,
    totalWeightGrams: number,
  ): Promise<Money> {
    if (calc === 'flat') {
      const rate = await this.db.query.shippingRates.findFirst({
        where: and(
          eq(shippingRates.companyId, companyId),
          eq(shippingRates.id, rateId),
        ),
      });
      return (rate?.flatAmount as Money) ?? '0';
    }

    if (calc === 'weight') {
      const tiers = await this.db
        .select()
        .from(shippingRateTiers)
        .where(
          and(
            eq(shippingRateTiers.companyId, companyId),
            eq(shippingRateTiers.rateId, rateId),
          ),
        )
        .orderBy(desc(shippingRateTiers.priority))
        .execute();

      const tier = tiers.find((t) => {
        const min = t.minWeightGrams ?? null;
        const max = t.maxWeightGrams ?? null;
        if (min === null || max === null) return false;
        return totalWeightGrams >= min && totalWeightGrams <= max;
      });

      return (tier?.amount as Money) ?? '0';
    }

    // subtotal tiers (future)
    return '0';
  }
}
