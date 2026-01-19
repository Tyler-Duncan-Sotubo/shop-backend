import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  inventoryItems,
  inventoryLocations,
} from 'src/infrastructure/drizzle/schema';

@Injectable()
export class InventoryAvailabilityService {
  constructor(@Inject(DRIZZLE) private readonly db: db) {}

  /**
   * HARD check — used by Cart & Checkout
   */
  async assertAvailable(
    companyId: string,
    locationId: string,
    variantId: string,
    requiredQty: number,
  ) {
    const [row] = await this.db
      .select({
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
      })
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.locationId, locationId),
          eq(inventoryItems.productVariantId, variantId),
        ),
      )
      .execute();

    const sellable =
      Number(row?.available ?? 0) -
      Number(row?.reserved ?? 0) -
      Number(row?.safetyStock ?? 0);

    if (sellable < requiredQty) {
      throw new BadRequestException('Insufficient stock for selected item');
    }
  }

  /**
   * Used by Cart (online channel)
   */
  async getWarehouseLocationId(companyId: string, storeId: string) {
    const warehouse = await this.db.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.companyId, companyId),
        eq(inventoryLocations.storeId, storeId),
        eq(inventoryLocations.type, 'warehouse'),
        eq(inventoryLocations.isActive, true),
      ),
    });

    if (!warehouse) {
      throw new BadRequestException('Warehouse location not configured');
    }

    return warehouse.id;
  }

  /**
   * Used when cart has multiple items (origin resolution)
   */
  async resolveBestOrigin(
    companyId: string,
    items: { variantId: string; quantity: number }[],
  ): Promise<string | null> {
    if (!items.length) return null;

    const variantIds = items.map((i) => i.variantId);

    const rows = await this.db
      .select({
        locationId: inventoryItems.locationId,
        variantId: inventoryItems.productVariantId,
        available: inventoryItems.available,
        reserved: inventoryItems.reserved,
        safetyStock: inventoryItems.safetyStock,
      })
      .from(inventoryItems)
      .innerJoin(
        inventoryLocations,
        eq(inventoryLocations.id, inventoryItems.locationId),
      )
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          inArray(inventoryItems.productVariantId, variantIds),
          eq(inventoryLocations.type, 'warehouse'),
          eq(inventoryLocations.isActive, true),
        ),
      )
      .execute();

    const byLocation = new Map<string, Map<string, number>>();

    for (const r of rows) {
      const sellable =
        Number(r.available ?? 0) -
        Number(r.reserved ?? 0) -
        Number(r.safetyStock ?? 0);

      if (!byLocation.has(r.locationId)) {
        byLocation.set(r.locationId, new Map());
      }

      byLocation.get(r.locationId)!.set(r.variantId, sellable);
    }

    for (const [locationId, stock] of byLocation.entries()) {
      const ok = items.every(
        (i) => (stock.get(i.variantId) ?? 0) >= i.quantity,
      );
      if (ok) return locationId;
    }

    return null;
  }
}
