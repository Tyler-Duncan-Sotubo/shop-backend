import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, desc, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  shippingZones,
  shippingZoneLocations,
} from 'src/infrastructure/drizzle/schema';
import { CreateZoneDto, UpsertZoneLocationDto } from '../dto';

@Injectable()
export class ShippingZonesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
  ) {}

  async listZones(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'zones', 'v1', storeId],
      async () => {
        return this.db
          .select()
          .from(shippingZones)
          .where(
            and(
              eq(shippingZones.companyId, companyId),
              storeId
                ? eq(shippingZones.storeId, storeId)
                : isNull(shippingZones.storeId),
            ),
          )
          .orderBy(desc(shippingZones.priority))
          .execute();
      },
    );
  }

  async createZone(
    companyId: string,
    dto: CreateZoneDto,
    user?: User,
    ip?: string,
  ) {
    const [zone] = await this.db
      .insert(shippingZones)
      .values({
        companyId,
        storeId: dto.storeId,
        name: dto.name,
        isActive: dto.isActive ?? true,
        priority: dto.priority ?? 0,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'shipping_zone',
        entityId: zone.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created shipping zone',
        changes: { companyId, zoneId: zone.id, name: dto.name },
      });
    }

    return zone;
  }

  async updateZone(
    companyId: string,
    zoneId: string,
    patch: Partial<CreateZoneDto>,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingZones.findFirst({
      where: and(
        eq(shippingZones.companyId, companyId),
        eq(shippingZones.id, zoneId),
      ),
    });
    if (!existing) throw new NotFoundException('Zone not found');

    const [updated] = await this.db
      .update(shippingZones)
      .set({
        name: patch.name ?? existing.name,
        priority: patch.priority ?? existing.priority,
        isActive: patch.isActive ?? existing.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(shippingZones.companyId, companyId),
          eq(shippingZones.id, zoneId),
        ),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'shipping_zone',
        entityId: zoneId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated shipping zone',
        changes: { companyId, zoneId, before: existing, after: updated },
      });
    }

    return updated;
  }

  async deleteZone(
    companyId: string,
    zoneId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingZones.findFirst({
      where: and(
        eq(shippingZones.companyId, companyId),
        eq(shippingZones.id, zoneId),
      ),
    });
    if (!existing) throw new NotFoundException('Zone not found');

    // delete locations first or rely on FK cascade (your schema uses cascade)
    await this.db
      .delete(shippingZones)
      .where(
        and(
          eq(shippingZones.companyId, companyId),
          eq(shippingZones.id, zoneId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'shipping_zone',
        entityId: zoneId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted shipping zone',
        changes: { companyId, zoneId, name: existing.name },
      });
    }

    return { ok: true };
  }

  async listZoneLocations(companyId: string, zoneId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['shipping', 'zones', 'locations', 'v1', zoneId],
      async () => {
        // validate zone belongs to company (avoid leaking ids)
        const zone = await this.db.query.shippingZones.findFirst({
          where: and(
            eq(shippingZones.companyId, companyId),
            eq(shippingZones.id, zoneId),
          ),
        });
        if (!zone) throw new NotFoundException('Zone not found');

        return this.db
          .select({
            id: shippingZoneLocations.id,
            countryCode: shippingZoneLocations.countryCode,
            regionCode: shippingZoneLocations.regionCode,
            area: shippingZoneLocations.area,
            zoneName: shippingZones.name,
          })
          .from(shippingZoneLocations)
          .innerJoin(
            shippingZones,
            eq(shippingZones.id, shippingZoneLocations.zoneId),
          )
          .where(
            and(
              eq(shippingZoneLocations.companyId, companyId),
              eq(shippingZoneLocations.zoneId, zoneId),
            ),
          )
          .orderBy(desc(shippingZoneLocations.createdAt))
          .execute();
      },
    );
  }

  async upsertZoneLocation(
    companyId: string,
    dto: UpsertZoneLocationDto,
    user?: User,
    ip?: string,
  ) {
    const zone = await this.db.query.shippingZones.findFirst({
      where: and(
        eq(shippingZones.companyId, companyId),
        eq(shippingZones.id, dto.zoneId),
      ),
    });
    if (!zone) throw new BadRequestException('Zone does not exist');

    const countryCode = (dto.countryCode ?? 'NG').toUpperCase();
    const regionCode = dto.state ?? null;
    const area = dto.area ?? null;

    // simple upsert pattern: try find existing exact match, else insert
    const existing = await this.db.query.shippingZoneLocations.findFirst({
      where: and(
        eq(shippingZoneLocations.companyId, companyId),
        eq(shippingZoneLocations.zoneId, dto.zoneId),
        eq(shippingZoneLocations.countryCode, countryCode),
        regionCode === null
          ? isNull(shippingZoneLocations.regionCode)
          : eq(shippingZoneLocations.regionCode, regionCode!),
        area === null
          ? isNull(shippingZoneLocations.area)
          : eq(shippingZoneLocations.area, area!),
      ),
    });

    if (existing) return existing;

    const [row] = await this.db
      .insert(shippingZoneLocations)
      .values({
        companyId,
        zoneId: dto.zoneId,
        countryCode,
        regionCode,
        area,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'shipping_zone_location',
        entityId: row.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Added zone location',
        changes: {
          companyId,
          zoneId: dto.zoneId,
          countryCode,
          regionCode,
          area,
        },
      });
    }

    return row;
  }

  async updateZoneLocation(
    companyId: string,
    locationId: string,
    dto: { countryCode?: string; state?: string | null; area?: string | null },
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingZoneLocations.findFirst({
      where: and(
        eq(shippingZoneLocations.companyId, companyId),
        eq(shippingZoneLocations.id, locationId),
      ),
    });
    if (!existing) throw new NotFoundException('Zone location not found');

    const nextCountryCode = (
      dto.countryCode ??
      existing.countryCode ??
      'NG'
    ).toUpperCase();
    const nextRegionCode =
      dto.state === undefined ? existing.regionCode : dto.state; // allow null
    const nextArea = dto.area === undefined ? existing.area : dto.area; // allow null

    // prevent duplicates (same zoneId + countryCode + regionCode + area) excluding this row
    const duplicate = await this.db.query.shippingZoneLocations.findFirst({
      where: and(
        eq(shippingZoneLocations.companyId, companyId),
        eq(shippingZoneLocations.zoneId, existing.zoneId),
        eq(shippingZoneLocations.countryCode, nextCountryCode),
        nextRegionCode === null
          ? isNull(shippingZoneLocations.regionCode)
          : eq(shippingZoneLocations.regionCode, nextRegionCode!),
        nextArea === null
          ? isNull(shippingZoneLocations.area)
          : eq(shippingZoneLocations.area, nextArea!),
        // exclude current record
        // drizzle doesn't have "ne" imported in your snippet; use raw condition:
        // If you already use `ne` elsewhere, replace with `ne(shippingZoneLocations.id, locationId)`
      ),
    });

    if (duplicate && duplicate.id !== locationId) {
      throw new BadRequestException('Zone location already exists');
    }

    const [updated] = await this.db
      .update(shippingZoneLocations)
      .set({
        countryCode: nextCountryCode,
        regionCode: nextRegionCode ?? null,
        area: nextArea ?? null,
      })
      .where(
        and(
          eq(shippingZoneLocations.companyId, companyId),
          eq(shippingZoneLocations.id, locationId),
        ),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'shipping_zone_location',
        entityId: locationId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated zone location',
        changes: { companyId, locationId, before: existing, after: updated },
      });
    }

    return updated;
  }

  async removeZoneLocation(
    companyId: string,
    locationId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.shippingZoneLocations.findFirst({
      where: and(
        eq(shippingZoneLocations.companyId, companyId),
        eq(shippingZoneLocations.id, locationId),
      ),
    });
    if (!existing) throw new NotFoundException('Zone location not found');

    await this.db
      .delete(shippingZoneLocations)
      .where(
        and(
          eq(shippingZoneLocations.companyId, companyId),
          eq(shippingZoneLocations.id, locationId),
        ),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'shipping_zone_location',
        entityId: locationId,
        userId: user.id,
        ipAddress: ip,
        details: 'Removed zone location',
        changes: { ...existing },
      });
    }

    return { ok: true };
  }

  // Nigeria-first resolution:
  // 1) NG + state + area
  // 2) NG + state
  // 3) NG only

  async resolveZone(
    companyId: string,
    storeId: string,
    countryCode: string,
    state?: string,
    area?: string,
  ) {
    const cc = (countryCode || 'NG').toUpperCase();

    const clean = (v?: string) => {
      const s = (v ?? '').trim();
      return s.length ? s : null;
    };

    const region = clean(state);
    const areaValue = clean(area);

    // helper: case-insensitive equality
    const eqCI = (col: any, value: string) =>
      sql`lower(${col}) = lower(${value})`;

    const tryMatch = async (
      regionCode: string | null,
      areaV: string | null,
    ) => {
      const rows = await this.db
        .select({
          zoneId: shippingZoneLocations.zoneId,
          zonePriority: shippingZones.priority,
        })
        .from(shippingZoneLocations)
        .leftJoin(
          shippingZones,
          and(
            eq(shippingZones.id, shippingZoneLocations.zoneId),
            eq(shippingZones.storeId, storeId),
          ),
        )
        .where(
          and(
            eq(shippingZoneLocations.companyId, companyId),
            eq(shippingZoneLocations.countryCode, cc),

            regionCode === null
              ? isNull(shippingZoneLocations.regionCode)
              : eqCI(shippingZoneLocations.regionCode, regionCode),

            // treat NULL and '' as "no area"
            areaV === null
              ? or(
                  isNull(shippingZoneLocations.area),
                  eq(shippingZoneLocations.area, ''),
                )
              : eqCI(shippingZoneLocations.area, areaV),

            eq(shippingZones.isActive, true),
          ),
        )
        .orderBy(desc(shippingZones.priority))
        .execute();

      if (rows.length === 0) return null;

      return this.db.query.shippingZones.findFirst({
        where: and(
          eq(shippingZones.companyId, companyId),
          eq(shippingZones.id, rows[0].zoneId),
        ),
      });
    };

    // most specific: state + area
    if (region && areaValue) {
      const z = await tryMatch(region, areaValue);
      if (z) return z;
    }

    // state-only
    if (region) {
      const z = await tryMatch(region, null);
      if (z) return z;
    }

    // country-only
    return tryMatch(null, null);
  }
}
