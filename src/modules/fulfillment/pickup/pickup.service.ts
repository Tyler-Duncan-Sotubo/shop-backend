import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { inventoryLocations, pickupLocations } from 'src/drizzle/schema';
import { db } from 'src/drizzle/types/drizzle';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { CreatePickupLocationDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';

@Injectable()
export class PickupService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Storefront listing should be store-scoped in a multi-store world.
   * If you truly want "all pickup locations across company", you can keep storeId optional.
   */
  async listStorefront(companyId: string, storeId: string, state?: string) {
    if (!storeId) throw new BadRequestException('storeId is required');

    const conditions = [
      eq(pickupLocations.companyId, companyId),
      eq(pickupLocations.storeId, storeId),
      eq(pickupLocations.isActive, true),
    ];

    if (state) conditions.push(eq(pickupLocations.state, state));

    return this.db
      .select({
        id: pickupLocations.id,
        name: pickupLocations.name,
        address1: sql<string>`(${pickupLocations.address} ->> 'address1')`,
        address2: sql<
          string | null
        >`(${pickupLocations.address} ->> 'address2')`,
        instructions: pickupLocations.instructions,
        state: pickupLocations.state,
        inventoryLocationId: pickupLocations.inventoryLocationId,
        inventoryName: inventoryLocations.name,
      })
      .from(pickupLocations)
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, pickupLocations.companyId),
          eq(inventoryLocations.id, pickupLocations.inventoryLocationId),
          // defensive: inventory location must match store
          eq(inventoryLocations.storeId, pickupLocations.storeId),
        ),
      )
      .where(and(...conditions))
      .execute();
  }

  /**
   * Admin listing – typically store-scoped, but allow optional storeId for company-wide admin views.
   */
  async listAdmin(companyId: string, storeId?: string) {
    const conditions = [
      eq(pickupLocations.companyId, companyId),
      storeId ? eq(pickupLocations.storeId, storeId) : undefined,
    ];

    return this.db
      .select({
        id: pickupLocations.id,
        name: pickupLocations.name,
        isActive: pickupLocations.isActive,
        storeId: pickupLocations.storeId,
        inventoryName: inventoryLocations.name,
        inventoryLocationId: pickupLocations.inventoryLocationId,
        state: pickupLocations.state,
        address1: sql<string>`(${pickupLocations.address} ->> 'address1')`,
        address2: sql<
          string | null
        >`(${pickupLocations.address} ->> 'address2')`,
        instructions: pickupLocations.instructions,
      })
      .from(pickupLocations)
      .innerJoin(
        inventoryLocations,
        and(
          eq(inventoryLocations.companyId, pickupLocations.companyId),
          eq(inventoryLocations.id, pickupLocations.inventoryLocationId),
          // defensive: inventory location must match store
          eq(inventoryLocations.storeId, pickupLocations.storeId),
        ),
      )
      .where(and(...conditions))
      .execute();
  }

  async get(companyId: string, id: string) {
    const row = await this.db.query.pickupLocations.findFirst({
      where: and(
        eq(pickupLocations.companyId, companyId),
        eq(pickupLocations.id, id),
      ),
    });
    if (!row) throw new NotFoundException('Pickup location not found');
    return row;
  }

  /**
   * Create pickup location.
   *
   * Assumes pickup_locations has:
   * - companyId
   * - storeId (NOT NULL)
   * - inventoryLocationId (NOT NULL)
   */
  async create(
    companyId: string,
    dto: CreatePickupLocationDto,
    user?: User,
    ip?: string,
  ) {
    if (!dto?.name?.trim()) throw new BadRequestException('name is required');
    if (!dto.storeId) throw new BadRequestException('storeId is required');
    if (!dto.inventoryLocationId) {
      throw new BadRequestException('inventoryLocationId is required');
    }
    if (!dto.state?.trim()) throw new BadRequestException('state is required');
    if (!dto.address1?.trim())
      throw new BadRequestException('address1 is required');

    // ✅ ensure inventory location belongs to company + store (prevents cross-store pickup)
    const invLoc = await this.db.query.inventoryLocations.findFirst({
      columns: { id: true, storeId: true, isActive: true },
      where: (f, { and, eq }) =>
        and(
          eq(f.companyId, companyId),
          eq(f.id, dto.inventoryLocationId),
          eq(f.storeId, dto.storeId),
        ),
    });
    if (!invLoc) {
      throw new BadRequestException(
        'Inventory location not found for this store',
      );
    }
    if (invLoc.isActive === false) {
      throw new BadRequestException('Inventory location is inactive');
    }

    // Optional: enforce unique pickup name per store (recommended uniqueness)
    // If you have a DB unique index, this is just nicer error messaging.
    const existingName = await this.db.query.pickupLocations.findFirst({
      columns: { id: true },
      where: (f, { and, eq }) =>
        and(
          eq(f.companyId, companyId),
          eq(f.storeId, dto.storeId),
          eq(f.name, dto.name.trim()),
        ),
    });
    if (existingName) {
      throw new BadRequestException(
        `Pickup location name '${dto.name.trim()}' already exists for this store`,
      );
    }

    const [row] = await this.db
      .insert(pickupLocations)
      .values({
        companyId,
        storeId: dto.storeId,
        name: dto.name.trim(),
        inventoryLocationId: dto.inventoryLocationId,
        state: dto.state.trim(),
        address: {
          address1: dto.address1.trim(),
          address2: dto.address2?.trim() ?? null,
        },
        instructions: dto.instructions ?? null,
        isActive: dto.isActive ?? true,
        updatedAt: new Date(),
      })
      .returning()
      .execute();

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'pickup_location',
        entityId: row.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created pickup location',
        changes: {
          companyId,
          storeId: row.storeId,
          pickupLocationId: row.id,
          name: row.name,
          inventoryLocationId: row.inventoryLocationId,
          isActive: row.isActive,
        },
      });
    }

    return row;
  }

  async update(
    companyId: string,
    id: string,
    dto: UpdatePickupDto,
    user?: User,
    ip?: string,
  ) {
    const existing = await this.db.query.pickupLocations.findFirst({
      where: and(
        eq(pickupLocations.companyId, companyId),
        eq(pickupLocations.id, id),
      ),
    });
    if (!existing) throw new NotFoundException('Pickup location not found');

    // Determine final store + location after update (so we can validate relationship)
    const nextStoreId = dto.storeId ?? existing.storeId;
    const nextInventoryLocationId =
      dto.inventoryLocationId ?? existing.inventoryLocationId;

    if (!nextStoreId) throw new BadRequestException('storeId is required');
    if (!nextInventoryLocationId) {
      throw new BadRequestException('inventoryLocationId is required');
    }

    // ✅ validate inventory location belongs to store (and company)
    const invLoc = await this.db.query.inventoryLocations.findFirst({
      columns: { id: true, storeId: true, isActive: true },
      where: (f, { and, eq }) =>
        and(
          eq(f.companyId, companyId),
          eq(f.id, nextInventoryLocationId),
          eq(f.storeId, nextStoreId),
        ),
    });
    if (!invLoc) {
      throw new BadRequestException(
        'Inventory location not found for this store',
      );
    }
    if (invLoc.isActive === false) {
      throw new BadRequestException('Inventory location is inactive');
    }

    // Optional: enforce unique name per store if name or store changes
    const nextName =
      dto.name === undefined ? existing.name : (dto.name?.trim() ?? '');
    if (!nextName) throw new BadRequestException('name cannot be empty');

    if (nextName !== existing.name || nextStoreId !== existing.storeId) {
      const nameTaken = await this.db.query.pickupLocations.findFirst({
        columns: { id: true },
        where: (f, { and, eq, ne }) =>
          and(
            eq(f.companyId, companyId),
            eq(f.storeId, nextStoreId),
            eq(f.name, nextName),
            ne(f.id, id),
          ),
      });
      if (nameTaken) {
        throw new BadRequestException(
          `Pickup location name '${nextName}' already exists for this store`,
        );
      }
    }

    const nextAddress =
      dto.address1 === undefined && dto.address2 === undefined
        ? undefined
        : {
            address1:
              dto.address1 === undefined
                ? (existing.address as any)?.address1
                : dto.address1,
            address2:
              dto.address2 === undefined
                ? (existing.address as any)?.address2
                : dto.address2,
          };

    const [row] = await this.db
      .update(pickupLocations)
      .set({
        name: dto.name === undefined ? undefined : nextName,
        state: dto.state === undefined ? undefined : dto.state?.trim(),
        storeId: dto.storeId === undefined ? undefined : nextStoreId,
        inventoryLocationId:
          dto.inventoryLocationId === undefined
            ? undefined
            : nextInventoryLocationId,
        address: nextAddress as any,
        instructions:
          dto.instructions === undefined ? undefined : dto.instructions,
        isActive: dto.isActive === undefined ? undefined : dto.isActive,
        updatedAt: new Date(),
      } as any)
      .where(
        and(
          eq(pickupLocations.companyId, companyId),
          eq(pickupLocations.id, id),
        ),
      )
      .returning()
      .execute();

    if (!row) throw new NotFoundException('Pickup location not found');

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'pickup_location',
        entityId: id,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated pickup location',
        changes: {
          companyId,
          pickupLocationId: id,
          before: existing,
          after: row,
        },
      });
    }

    return row;
  }

  async deactivate(companyId: string, id: string, user?: User, ip?: string) {
    const existing = await this.db.query.pickupLocations.findFirst({
      where: and(
        eq(pickupLocations.companyId, companyId),
        eq(pickupLocations.id, id),
      ),
    });
    if (!existing) throw new NotFoundException('Pickup location not found');

    const [row] = await this.db
      .update(pickupLocations)
      .set({ isActive: false, updatedAt: new Date() } as any)
      .where(
        and(
          eq(pickupLocations.companyId, companyId),
          eq(pickupLocations.id, id),
        ),
      )
      .returning()
      .execute();

    if (!row) throw new NotFoundException('Pickup location not found');

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'pickup_location',
        entityId: id,
        userId: user.id,
        ipAddress: ip,
        details: 'Deactivated pickup location',
        changes: {
          companyId,
          pickupLocationId: id,
          before: existing,
          after: row,
        },
      });
    }

    return row;
  }
}
