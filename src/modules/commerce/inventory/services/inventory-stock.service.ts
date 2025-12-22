// src/modules/inventory/inventory-stock.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import {
  inventoryItems,
  inventoryLocations,
  inventoryReservations,
  products,
  productVariants,
} from 'src/drizzle/schema';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import { InventoryLocationsService } from './inventory-locations.service';
import { InventoryLedgerService } from './inventory-ledger.service';

type SetInventoryOptions = {
  tx?: db;
  skipCacheBump?: boolean;
  skipAudit?: boolean;
};

type InventoryOverviewQuery = {
  locationId?: string; // if omitted -> default warehouse
  search?: string; // product name / variant title / sku
  status?: 'active' | 'draft' | 'archived'; // product status filter (optional)
  limit?: number;
  offset?: number;
  storeId?: string; // future use
};

type Ref =
  | { refType: 'order'; refId: string }
  | { refType: 'reservation'; refId: string }
  | { refType: 'pos'; refId: string }
  | { refType: string; refId: string }
  | null;

@Injectable()
export class InventoryStockService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly locationsService: InventoryLocationsService,
    private readonly ledger: InventoryLedgerService,
  ) {}

  /**
   * Low-level stock adjust, used inside transactions.
   * deltaAvailable / deltaReserved can be positive or negative.
   * Will create a row if it doesn't exist (only if resulting stock is non-negative).
   */
  async adjustInventoryInTx(
    tx: db,
    companyId: string,
    productVariantId: string,
    locationId: string,
    deltaAvailable: number,
    deltaReserved = 0,
  ) {
    // 1) Get storeId from the location (authoritative)
    const loc = await tx.query.inventoryLocations.findFirst({
      columns: { id: true, storeId: true, isActive: true },
      where: (f, { and, eq }) =>
        and(eq(f.companyId, companyId), eq(f.id, locationId)),
    });

    if (!loc) {
      throw new BadRequestException(
        'Inventory location not found for this company.',
      );
    }
    if (loc.isActive === false) {
      throw new BadRequestException('Inventory location is inactive.');
    }

    const storeId = loc.storeId;

    // 2) Read existing inventory row
    const existing = await tx.query.inventoryItems.findFirst({
      where: (f, { and, eq }) =>
        and(
          eq(f.companyId, companyId),
          eq(f.productVariantId, productVariantId),
          eq(f.locationId, locationId),
        ),
    });

    // 3) Insert path
    if (!existing) {
      const newAvailable = deltaAvailable;
      const newReserved = deltaReserved;

      if (newAvailable < 0 || newReserved < 0) {
        throw new BadRequestException(
          'Insufficient stock for this operation at the specified location.',
        );
      }

      await tx
        .insert(inventoryItems)
        .values({
          companyId,
          storeId, // ✅ required and valid
          productVariantId,
          locationId,
          available: newAvailable,
          reserved: newReserved,
          safetyStock: 0,
        })
        .execute();

      return;
    }

    // Optional safety check: ensure existing row's storeId matches location's storeId
    // (helps catch legacy/bad data)
    if (existing.storeId !== storeId) {
      throw new BadRequestException(
        'Inventory item store mismatch for the specified location.',
      );
    }

    // 4) Update path
    const newAvailable = existing.available + deltaAvailable;
    const newReserved = existing.reserved + deltaReserved;

    if (newAvailable < 0 || newReserved < 0) {
      throw new BadRequestException(
        'Insufficient stock for this operation at the specified location.',
      );
    }

    await tx
      .update(inventoryItems)
      .set({
        available: newAvailable,
        reserved: newReserved,
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, existing.id))
      .execute();
  }

  /**
   * Hard-set the available quantity for a variant at a location.
   * Useful for initial stock, full stocktakes, etc.
   */
  async setInventoryLevel(
    companyId: string,
    productVariantId: string,
    quantity: number,
    safetyStock = 0,
    user?: User,
    ip?: string,
    opts?: SetInventoryOptions,
  ) {
    const tx = opts?.tx ?? this.db;

    if (quantity < 0)
      throw new BadRequestException('Quantity cannot be negative');

    // 1) Find store for this variant (prefer variant.storeId if you have it)
    const variant = await tx.query.productVariants.findFirst({
      columns: { id: true, storeId: true },
      where: (f, { and, eq }) =>
        and(eq(f.companyId, companyId), eq(f.id, productVariantId)),
    });
    if (!variant) throw new NotFoundException('Variant not found');

    // 2) Find default warehouse location FOR THAT STORE
    const locationId = await this.getDefaultWarehouseLocationId(
      companyId,
      variant.storeId,
    );

    if (!locationId) {
      return { items: [], locationId: null };
    }

    const existing = await tx.query.inventoryItems.findFirst({
      where: (fields, { and, eq }) =>
        and(
          eq(fields.companyId, companyId),
          eq(fields.productVariantId, productVariantId),
          eq(fields.locationId, locationId),
        ),
    });

    let before: any = null;
    let after: any = null;

    if (!existing) {
      const [inserted] = await tx
        .insert(inventoryItems)
        .values({
          companyId,
          storeId: variant.storeId,
          productVariantId,
          locationId,
          available: quantity,
          reserved: 0,
          safetyStock,
        })
        .returning()
        .execute();
      after = inserted;
    } else {
      before = existing;
      const [updated] = await tx
        .update(inventoryItems)
        .set({
          storeId: variant.storeId,
          available: quantity,
          safetyStock,
          updatedAt: new Date(),
        })
        .where(eq(inventoryItems.id, existing.id))
        .returning()
        .execute();
      after = updated;
    }

    if (!opts?.skipCacheBump) await this.cache.bumpCompanyVersion(companyId);

    if (!opts?.skipAudit && user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'inventory_item',
        entityId: after.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Set inventory level at default store warehouse',
        changes: { companyId, productVariantId, locationId, before, after },
      });
    }

    return after;
  }

  /**
   * Adjust the available quantity for a variant at a location by a delta.
   * Uses same safety checks as transfers (no negative).
   */
  async adjustInventoryLevel(
    companyId: string,
    productVariantId: string,
    locationId: string,
    delta: number,
    user?: User,
    ip?: string,
  ) {
    await this.locationsService.findLocationByIdOrThrow(companyId, locationId);

    const result = await this.db.transaction(async (tx) => {
      await this.adjustInventoryInTx(
        tx,
        companyId,
        productVariantId,
        locationId,
        delta,
      );

      const updated = await tx.query.inventoryItems.findFirst({
        where: and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.productVariantId, productVariantId),
          eq(inventoryItems.locationId, locationId),
        ),
      });

      return updated;
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip && result) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'inventory_item',
        entityId: result.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Adjusted inventory level at location',
        changes: {
          companyId,
          productVariantId,
          locationId,
          delta,
        },
      });
    }

    return result;
  }

  private async getDefaultWarehouseLocationId(
    companyId: string,
    storeId: string,
  ) {
    const row = await this.db.query.inventoryLocations.findFirst({
      columns: { id: true },
      where: (f, { and, eq }) =>
        and(
          eq(f.companyId, companyId),
          eq(f.storeId, storeId),
          eq(f.type, 'warehouse'),
          eq(f.isDefault, true),
          eq(f.isActive, true),
        ),
    });

    return row?.id ?? null;
  }

  async getInventoryOverview(companyId: string, query: InventoryOverviewQuery) {
    const { search, status, storeId, limit = 50, offset = 0 } = query;

    if (!storeId) throw new BadRequestException('storeId is required');

    // ✅ store-aware default warehouse
    const locationId =
      query.locationId ??
      (await this.getDefaultWarehouseLocationId(companyId, storeId));

    if (!locationId) return [];

    const cacheKey = [
      'inventory',
      'overview',
      'store',
      storeId,
      'location',
      locationId,
      'status',
      status ?? 'any',
      'search',
      (search ?? '').trim() || 'none',
      'limit',
      String(limit),
      'offset',
      String(offset),
    ];

    return this.cache.getOrSetVersioned(companyId, cacheKey, async () => {
      // ✅ location must belong to store (no join table needed)
      const location = await this.db.query.inventoryLocations.findFirst({
        columns: { id: true },
        where: (f, { and, eq }) =>
          and(
            eq(f.companyId, companyId),
            eq(f.storeId, storeId),
            eq(f.id, locationId),
            eq(f.isActive, true),
          ),
      });

      if (!location) {
        return [];
      }

      const whereClauses: any[] = [
        eq(productVariants.companyId, companyId),
        eq(products.storeId, storeId), // ✅ product scope
        eq(inventoryLocations.id, locationId), // single chosen location
        eq(inventoryLocations.storeId, storeId), // ✅ location scope
      ];

      if (status) whereClauses.push(eq(products.status, status));

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        whereClauses.push(
          or(
            ilike(products.name, q),
            ilike(productVariants.title, q),
            ilike(productVariants.sku, q),
          ),
        );
      }

      const rows = await this.db
        .select({
          locationId: inventoryLocations.id,
          locationName: inventoryLocations.name,
          locationType: inventoryLocations.type,

          productId: products.id,
          productName: products.name,
          productStatus: products.status,

          variantId: productVariants.id,
          variantTitle: productVariants.title,
          sku: productVariants.sku,
          isVariantActive: productVariants.isActive,

          // ✅ only rows that exist in inventory_items for this location will appear
          available: inventoryItems.available,
          reserved: inventoryItems.reserved,
          safetyStock: inventoryItems.safetyStock,
          updatedAt: inventoryItems.updatedAt,
        })
        .from(inventoryItems) // ✅ start from inventoryItems to guarantee location-scoped results
        .innerJoin(
          inventoryLocations,
          and(
            eq(inventoryLocations.companyId, companyId),
            eq(inventoryLocations.storeId, storeId),
            eq(inventoryLocations.id, locationId),
            eq(inventoryLocations.id, inventoryItems.locationId),
          ),
        )
        .innerJoin(
          productVariants,
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.id, inventoryItems.productVariantId),
          ),
        )
        .innerJoin(
          products,
          and(
            eq(products.companyId, companyId),
            eq(products.id, productVariants.productId),
            eq(products.storeId, storeId),
          ),
        )
        .where(
          and(
            eq(inventoryItems.companyId, companyId),
            eq(inventoryItems.locationId, locationId),

            // ✅ enforce store scope if column exists
            eq(inventoryItems.storeId, storeId),
            // optional filters:
            ...(status ? [eq(products.status, status)] : []),
            ...(search?.trim()
              ? [
                  or(
                    ilike(products.name, `%${search.trim()}%`),
                    ilike(productVariants.title, `%${search.trim()}%`),
                    ilike(productVariants.sku, `%${search.trim()}%`),
                  ),
                ]
              : []),
          ),
        )
        .orderBy(products.name, productVariants.title)
        .limit(limit)
        .offset(offset)
        .execute();

      return rows.map((r) => {
        const available = Number(r.available ?? 0);
        const reserved = Number(r.reserved ?? 0);
        const safetyStock = Number(r.safetyStock ?? 0);

        return {
          ...r,
          inStock: available,
          committed: reserved,
          onHand: available + reserved,
          lowStock: available <= safetyStock,
        };
      });
    });
  }

  // --------------------------
  // Cart and Order Helpers
  // --------------------------
  async reserveInTx(
    tx: db,
    companyId: string,
    orderId: string,
    locationId: string,
    productVariantId: string,
    qty: number,
  ) {
    if (!Number.isFinite(qty) || qty <= 0) return;

    // 1) check existing reservation for this order + variant + location
    const existing = await tx
      .select({ quantity: inventoryReservations.quantity })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.companyId, companyId),
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.locationId, locationId),
          eq(inventoryReservations.productVariantId, productVariantId),
          eq(inventoryReservations.status, 'reserved' as any),
        ),
      )
      .limit(1)
      .execute();

    const alreadyReserved = Number(existing?.[0]?.quantity ?? 0);
    const delta = qty - alreadyReserved;

    // idempotent: already reserved enough
    if (delta <= 0) return;

    // 2) reserve only the delta on inventory_items (sellable guard)
    const updated = await tx
      .update(inventoryItems)
      .set({
        reserved: sql<number>`${inventoryItems.reserved} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, locationId),
          eq(inventoryItems.productVariantId, productVariantId),
          sql`(${inventoryItems.available} - ${inventoryItems.reserved} - ${inventoryItems.safetyStock}) >= ${delta}`,
        ),
      )
      .returning({ id: inventoryItems.id })
      .execute();

    if (updated.length === 0) {
      throw new BadRequestException('Insufficient sellable stock to reserve.');
    }

    // ✅ ledger: reserve increases reserved
    await this.ledger.logInTx(tx, {
      companyId,
      locationId,
      productVariantId,
      type: 'reserve',
      deltaAvailable: 0,
      deltaReserved: +delta,
      ref: { refType: 'order', refId: orderId },
      note: 'Reserved stock for order',
      meta: { requestedQty: qty, alreadyReserved, delta },
    });

    // 3) upsert reservation row to target qty
    await tx
      .insert(inventoryReservations)
      .values({
        companyId,
        orderId,
        locationId,
        productVariantId,
        quantity: qty,
        status: 'reserved' as any,
        expiresAt: null,
      } as any)
      .onConflictDoUpdate({
        target: [
          inventoryReservations.companyId,
          inventoryReservations.orderId,
          inventoryReservations.locationId,
          inventoryReservations.productVariantId,
        ],
        set: {
          quantity: qty,
          status: 'reserved' as any,
        },
      })
      .execute();
  }

  async reserveForOrderInTx(
    tx: db,
    companyId: string,
    orderId: string,
    locationId: string,
    productVariantId: string,
    qty: number,
  ) {
    if (!Number.isFinite(qty) || qty <= 0) return;

    // existing reservation for this order+variant+location
    const existing = await tx
      .select({ quantity: inventoryReservations.quantity })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.companyId, companyId),
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.locationId, locationId),
          eq(inventoryReservations.productVariantId, productVariantId),
          eq(inventoryReservations.status, 'reserved' as any),
        ),
      )
      .limit(1)
      .execute();

    const already = Number(existing?.[0]?.quantity ?? 0);
    const delta = qty - already;

    if (delta <= 0) return;

    const updated = await tx
      .update(inventoryItems)
      .set({
        reserved: sql<number>`${inventoryItems.reserved} + ${delta}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, locationId),
          eq(inventoryItems.productVariantId, productVariantId),
          sql`(${inventoryItems.available} - ${inventoryItems.reserved} - ${inventoryItems.safetyStock}) >= ${delta}`,
        ),
      )
      .returning({ id: inventoryItems.id })
      .execute();

    if (updated.length === 0) {
      throw new BadRequestException('Insufficient sellable stock to reserve.');
    }

    // ✅ ledger
    await this.ledger.logInTx(tx, {
      companyId,
      locationId,
      productVariantId,
      type: 'reserve',
      deltaReserved: +delta,
      ref: { refType: 'order', refId: orderId },
      note: 'Reserved stock for order (reserveForOrderInTx)',
      meta: { requestedQty: qty, alreadyReserved: already, delta },
    });

    await tx
      .insert(inventoryReservations)
      .values({
        companyId,
        orderId,
        locationId,
        productVariantId,
        quantity: qty,
        status: 'reserved' as any,
        expiresAt: null,
      } as any)
      .onConflictDoUpdate({
        target: [
          inventoryReservations.companyId,
          inventoryReservations.orderId,
          inventoryReservations.locationId,
          inventoryReservations.productVariantId,
        ],
        set: {
          quantity: qty,
          status: 'reserved' as any,
        },
      })
      .execute();
  }

  async releaseOrderReservationsInTx(
    tx: db,
    companyId: string,
    orderId: string,
  ) {
    const rows = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.companyId, companyId),
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, 'reserved' as any),
        ),
      )
      .execute();

    for (const r of rows) {
      const qty = Number(r.quantity ?? 0);
      if (qty <= 0) continue;

      // decrement reserved
      await this.releaseReservationInTx(
        tx,
        companyId,
        r.locationId,
        r.productVariantId,
        qty,
        { refType: 'order', refId: orderId },
        { reservationId: r.id },
      );

      // mark reservation released
      await tx
        .update(inventoryReservations)
        .set({ status: 'released' as any })
        .where(
          and(
            eq(inventoryReservations.companyId, companyId),
            eq(inventoryReservations.id, r.id),
          ),
        )
        .execute();
    }
  }

  async releaseReservationInTx(
    tx: db,
    companyId: string,
    locationId: string,
    productVariantId: string,
    qty: number,
    ref?: Ref,
    meta?: any,
  ) {
    if (!Number.isFinite(qty) || qty <= 0) return;
    const updated = await tx
      .update(inventoryItems)
      .set({
        reserved: sql<number>`${inventoryItems.reserved} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, locationId),
          eq(inventoryItems.productVariantId, productVariantId),
          sql`${inventoryItems.reserved} >= ${qty}`,
        ),
      )
      .returning({ id: inventoryItems.id })
      .execute();

    if (updated.length === 0) {
      throw new BadRequestException(
        'Cannot release reservation (reserved too low).',
      );
    }

    // ✅ ledger: release decreases reserved
    await this.ledger.logInTx(tx, {
      companyId,
      locationId,
      productVariantId,
      type: 'release',
      deltaReserved: -qty,
      ref: ref ?? null,
      note: 'Released reserved stock',
      meta,
    });
  }

  async fulfillOrderReservationsInTx(
    tx: db,
    companyId: string,
    orderId: string,
  ) {
    const rows = await tx
      .select()
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.companyId, companyId),
          eq(inventoryReservations.orderId, orderId),
          eq(inventoryReservations.status, 'reserved' as any),
        ),
      )
      .execute();

    for (const r of rows) {
      const qty = Number(r.quantity ?? 0);
      if (qty <= 0) continue;

      await this.fulfillFromReservationInTx(
        tx,
        companyId,
        r.locationId,
        r.productVariantId,
        qty,
        { refType: 'order', refId: orderId },
        { reservationId: r.id },
      );

      await tx
        .update(inventoryReservations)
        .set({ status: 'fulfilled' as any })
        .where(
          and(
            eq(inventoryReservations.companyId, companyId),
            eq(inventoryReservations.id, r.id),
          ),
        )
        .execute();
    }
  }

  async fulfillFromReservationInTx(
    tx: db,
    companyId: string,
    locationId: string,
    productVariantId: string,
    qty: number,
    ref?: Ref,
    meta?: any,
  ) {
    if (!Number.isFinite(qty) || qty <= 0) return;

    const updated = await tx
      .update(inventoryItems)
      .set({
        available: sql<number>`${inventoryItems.available} - ${qty}`,
        reserved: sql<number>`${inventoryItems.reserved} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, locationId),
          eq(inventoryItems.productVariantId, productVariantId),
          sql`${inventoryItems.reserved} >= ${qty}`,
          sql`${inventoryItems.available} >= ${qty}`,
        ),
      )
      .returning({ id: inventoryItems.id })
      .execute();

    if (updated.length === 0) {
      throw new BadRequestException(
        'Cannot fulfill (insufficient reserved/available).',
      );
    }

    // ✅ ledger: fulfill reduces available and reserved
    await this.ledger.logInTx(tx, {
      companyId,
      locationId,
      productVariantId,
      type: 'fulfill',
      deltaAvailable: -qty,
      deltaReserved: -qty,
      ref: ref ?? null,
      note: 'Fulfilled reserved stock',
      meta,
    });
  }

  async deductAvailableInTx(
    tx: db,
    companyId: string,
    locationId: string,
    variantId: string,
    qty: number,
    ref?: Ref,
    meta?: any,
  ) {
    if (!Number.isFinite(qty) || qty <= 0) return;

    const rows = await tx
      .update(inventoryItems)
      .set({
        available: sql<number>`${inventoryItems.available} - ${qty}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, locationId),
          eq(inventoryItems.productVariantId, variantId),
          sql`(${inventoryItems.available} - ${inventoryItems.reserved} - ${inventoryItems.safetyStock}) >= ${qty}`,
        ),
      )
      .returning({ id: inventoryItems.id })
      .execute();

    if (rows.length === 0) {
      throw new BadRequestException('Insufficient sellable stock to deduct.');
    }

    // ✅ ledger: POS deduct reduces available only
    await this.ledger.logInTx(tx, {
      companyId,
      locationId,
      productVariantId: variantId,
      type: 'pos_deduct',
      deltaAvailable: -qty,
      deltaReserved: 0,
      ref: ref ?? null,
      note: 'POS deducted stock',
      meta,
    });
  }
}
