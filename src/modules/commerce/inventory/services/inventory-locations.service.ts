// src/modules/inventory/inventory-locations.service.ts
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
  inventoryLocations,
  stores,
  storeLocations,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  CreateLocationDto,
  UpdateLocationDto,
  UpdateStoreLocationsDto,
} from '../dto';

@Injectable()
export class InventoryLocationsService {
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

  async findLocationByIdOrThrow(companyId: string, locationId: string) {
    const loc = await this.db.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.companyId, companyId),
        eq(inventoryLocations.id, locationId),
      ),
    });

    if (!loc) {
      throw new NotFoundException(
        `Location not found for company ${companyId}`,
      );
    }

    return loc;
  }

  async assertStoreBelongsToCompany(companyId: string, storeId: string) {
    const store = await this.db.query.stores.findFirst({
      where: and(eq(stores.companyId, companyId), eq(stores.id, storeId)),
    });

    return store ?? null;
  }

  // ----------------- Locations CRUD -----------------

  async createLocation(
    companyId: string,
    dto: CreateLocationDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertCompanyExists(companyId);

    // ✅ storeId should exist and belong to company
    const store = await this.assertStoreBelongsToCompany(
      companyId,
      dto.storeId,
    );
    if (!store)
      throw new BadRequestException('Store not found for this company');

    // ✅ code uniqueness: per store (recommended)
    if (dto.code) {
      const existing = await this.db.query.inventoryLocations.findFirst({
        where: and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.storeId, dto.storeId),
          eq(inventoryLocations.code, dto.code),
        ),
      });

      if (existing) {
        throw new BadRequestException(
          `Location code '${dto.code}' already exists for this store`,
        );
      }
    }

    // ✅ only one warehouse per store
    if (dto.type === 'warehouse') {
      await this.checkWarehouseExists(dto.type, companyId, dto.storeId);
    }

    const isDefault = dto.isDefault ?? dto.type === 'warehouse';

    // ✅ if making default, clear existing defaults for this store
    // (especially for warehouses)
    if (isDefault) {
      await this.db
        .update(inventoryLocations)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(inventoryLocations.companyId, companyId),
            eq(inventoryLocations.storeId, dto.storeId),
            eq(inventoryLocations.isDefault, true),
          ),
        )
        .execute();
    }

    const [loc] = await this.db
      .insert(inventoryLocations)
      .values({
        companyId,
        storeId: dto.storeId,
        name: dto.name,
        code: dto.code,
        type: dto.type,
        isDefault,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        region: dto.region,
        postalCode: dto.postalCode,
        country: dto.country,
        isActive: dto.isActive ?? true,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'inventory_location',
        entityId: loc.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created inventory location',
        changes: {
          companyId,
          storeId: dto.storeId,
          locationId: loc.id,
          name: loc.name,
          type: loc.type,
          isDefault: loc.isDefault,
        },
      });
    }

    return loc;
  }

  async getLocationsByCompany(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['inventory', 'locations'],
      async () => {
        return this.db
          .select()
          .from(inventoryLocations)
          .where(eq(inventoryLocations.companyId, companyId))
          .execute();
      },
    );
  }

  async getLocationsForStore(companyId: string, storeId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['inventory', 'locations', 'store', storeId], // ✅ store-aware cache
      async () => {
        return this.db
          .select({
            id: inventoryLocations.id,
            storeId: inventoryLocations.storeId, // optional but often useful
            name: inventoryLocations.name,
            code: inventoryLocations.code,
            type: inventoryLocations.type,

            // optional address fields (if your UI needs them)
            addressLine1: inventoryLocations.addressLine1,
            addressLine2: inventoryLocations.addressLine2,
            city: inventoryLocations.city,
            region: inventoryLocations.region,
            postalCode: inventoryLocations.postalCode,
            country: inventoryLocations.country,

            isActive: inventoryLocations.isActive, // optional but useful
            // isPrimary: inventoryLocations.isPrimary, // include ONLY if this column exists
          })
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              eq(inventoryLocations.storeId, storeId),
            ),
          )
          .orderBy(sql`${inventoryLocations.name} ASC`)
          .execute();
      },
    );
  }

  async updateLocation(
    companyId: string,
    locationId: string,
    dto: UpdateLocationDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findLocationByIdOrThrow(companyId, locationId);
    // check if we already have a warehouse if the new location is a warehouse
    if (dto.type === 'warehouse' && existing.type !== 'warehouse') {
      await this.checkWarehouseExists(
        dto.type,
        companyId,
        dto.storeId || existing.storeId,
      );
    }

    const [updated] = await this.db
      .update(inventoryLocations)
      .set({
        name: dto.name ?? existing.name,
        code: dto.code ?? existing.code,
        type: dto.type ?? existing.type,
        addressLine1: dto.addressLine1 ?? existing.addressLine1,
        addressLine2: dto.addressLine2 ?? existing.addressLine2,
        city: dto.city ?? existing.city,
        region: dto.region ?? existing.region,
        postalCode: dto.postalCode ?? existing.postalCode,
        country: dto.country ?? existing.country,
        isActive: dto.isActive === undefined ? existing.isActive : dto.isActive,
      })
      .where(
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, locationId),
        ),
      )
      .returning()
      .execute();

    if (!updated) {
      throw new NotFoundException('Location not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'inventory_location',
        entityId: updated.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated inventory location',
        changes: {
          companyId,
          locationId: updated.id,
          before: existing,
          after: updated,
        },
      });
    }

    return updated;
  }

  async deleteLocation(
    companyId: string,
    locationId: string,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.findLocationByIdOrThrow(companyId, locationId);

    const [deleted] = await this.db
      .delete(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.id, locationId),
        ),
      )
      .returning()
      .execute();

    if (!deleted) {
      throw new NotFoundException('Location not found');
    }

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'inventory_location',
        entityId: locationId,
        userId: user.id,
        ipAddress: ip,
        details: 'Deleted inventory location',
        changes: {
          companyId,
          locationId,
          name: existing.name,
          code: existing.code,
        },
      });
    }

    return { success: true };
  }

  private async checkWarehouseExists(
    type: string,
    companyId: string,
    storeId: string,
  ) {
    const warehouse = await this.db.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.companyId, companyId),
        eq(inventoryLocations.type, 'warehouse'),
        eq(inventoryLocations.storeId, storeId),
      ),
    });

    if (warehouse) {
      throw new BadRequestException(
        `A warehouse location already exists for this store`,
      );
    }
  }

  // ----------------- Store ↔ Locations mapping -----------------

  async getStoreLocations(companyId: string, storeId: string) {
    await this.assertStoreBelongsToCompany(companyId, storeId);

    return this.cache.getOrSetVersioned(
      companyId,
      ['inventory', 'store', storeId, 'locations', 'v2'],
      async () => {
        return this.db
          .select({
            id: inventoryLocations.id,
            storeId: inventoryLocations.storeId,
            name: inventoryLocations.name,
            code: inventoryLocations.code,
            type: inventoryLocations.type,
            addressLine1: inventoryLocations.addressLine1,
            addressLine2: inventoryLocations.addressLine2,
            city: inventoryLocations.city,
            region: inventoryLocations.region,
            postalCode: inventoryLocations.postalCode,
            country: inventoryLocations.country,
            isActive: inventoryLocations.isActive,
            createdAt: inventoryLocations.createdAt,
            updatedAt: inventoryLocations.updatedAt,
          })
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              eq(inventoryLocations.storeId, storeId),
              eq(inventoryLocations.isActive, true),
            ),
          )
          .orderBy(inventoryLocations.type, inventoryLocations.name)
          .execute();
      },
    );
  }

  async getStoreLocationOptions(companyId: string, storeId: string) {
    await this.assertStoreBelongsToCompany(companyId, storeId);
    return this.cache.getOrSetVersioned(
      companyId,
      ['inventory', 'store', storeId, 'locationOptions'],
      async () => {
        const rows = await this.db
          .select({
            locationId: inventoryLocations.id,
            isPrimary: inventoryLocations.isDefault,
            isActive: inventoryLocations.isActive,
            name: inventoryLocations.name,
            type: inventoryLocations.type, // warehouse | store
          })
          .from(inventoryLocations)
          .where(
            and(
              eq(inventoryLocations.companyId, companyId),
              eq(inventoryLocations.storeId, storeId),
            ),
          )
          .execute();

        return rows;
      },
    );
  }

  async updateStoreLocations(
    companyId: string,
    storeId: string,
    dto: UpdateStoreLocationsDto,
    user?: User,
    ip?: string,
  ) {
    await this.assertStoreBelongsToCompany(companyId, storeId);

    const locationIds = dto.locationIds ?? [];

    // If empty -> clear all mappings and return
    if (locationIds.length === 0) {
      await this.db
        .delete(storeLocations)
        .where(eq(storeLocations.storeId, storeId))
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (user && ip) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'store_locations',
          entityId: storeId,
          userId: user.id,
          ipAddress: ip,
          details: 'Cleared locations assigned to store',
          changes: {
            companyId,
            storeId,
            locationIds: [],
          },
        });
      }

      return [];
    }

    // 1️⃣ Validate all locations belong to this company and get their type
    const locs = await this.db
      .select({
        id: inventoryLocations.id,
        type: inventoryLocations.type,
      })
      .from(inventoryLocations)
      .where(
        and(
          eq(inventoryLocations.companyId, companyId),
          inArray(inventoryLocations.id, locationIds),
        ),
      )
      .execute();

    if (locs.length !== locationIds.length) {
      const validIds = new Set(locs.map((l) => l.id));
      const invalid = locationIds.filter((id) => !validIds.has(id));
      throw new BadRequestException(
        `Some locations do not belong to this company: ${invalid.join(', ')}`,
      );
    }

    // 2️⃣ Force primary = warehouse
    const warehouses = locs.filter((l) => l.type === 'warehouse');

    if (warehouses.length === 0) {
      // strict: require at least one warehouse
      throw new BadRequestException(
        'At least one warehouse location is required for a store.',
      );
    }

    if (warehouses.length > 1) {
      // strict: only one warehouse allowed per store
      throw new BadRequestException(
        'More than one warehouse provided. Only one warehouse can be primary for a store.',
      );
    }

    const primaryLocationId = warehouses[0].id;

    // 3️⃣ Clear existing mappings
    await this.db
      .delete(storeLocations)
      .where(eq(storeLocations.storeId, storeId))
      .execute();

    // 4️⃣ Insert new mappings with isPrimary set
    const inserted = await this.db
      .insert(storeLocations)
      .values(
        locationIds.map((locationId) => ({
          storeId,
          locationId,
          isActive: true,
          isPrimary: locationId === primaryLocationId,
        })),
      )
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'store_locations',
        entityId: storeId,
        userId: user.id,
        ipAddress: ip,
        details:
          'Updated locations assigned to store (primary forced to warehouse)',
        changes: {
          companyId,
          storeId,
          locationIds,
          primaryLocationId,
        },
      });
    }

    return inserted;
  }
}
