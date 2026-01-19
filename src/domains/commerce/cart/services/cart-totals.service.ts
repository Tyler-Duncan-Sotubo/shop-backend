// cart-totals.service.ts
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';

import {
  carts,
  inventoryItems,
  inventoryLocations,
  shippingRateTiers,
  shippingRates,
  shippingZoneLocations,
  shippingZones,
} from 'src/infrastructure/drizzle/schema';

import { CartQueryService } from './cart-query.service';

type Money = string;
type WeightValue = string | number | null;

@Injectable()
export class CartTotalsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cartQuery: CartQueryService,
    private readonly auditService: AuditService,
  ) {}

  // -----------------------------
  // MOVED: recalculateTotals (unchanged)
  // -----------------------------
  async recalculateTotals(
    companyId: string,
    storeId: string,
    cartId: string,
    user?: User,
    ip?: string,
    meta?: Record<string, any>,
  ) {
    const cart = await this.cartQuery.getCartByIdOrThrow(
      companyId,
      storeId,
      cartId,
    );
    const items = await this.cartQuery.getCartItems(companyId, storeId, cartId);

    let resolvedOriginLocationId: string | null = null;

    if (cart.channel === 'pos' && cart.originInventoryLocationId) {
      resolvedOriginLocationId = cart.originInventoryLocationId;
    } else {
      resolvedOriginLocationId = await this.resolveOriginInventoryLocationId(
        companyId,
        items.map((it) => ({
          variantId: it.variantId ?? null,
          quantity: Number(it.quantity ?? 0),
        })),
      );
    }

    const originChanged =
      (cart.originInventoryLocationId ?? null) !==
      (resolvedOriginLocationId ?? null);

    if (originChanged) {
      await this.db
        .update(carts)
        .set({
          originInventoryLocationId: resolvedOriginLocationId,
          updatedAt: new Date(),
        })
        .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
        .execute();
    }

    const subtotal = items.reduce(
      (sum, it) => this.addMoney(sum, it.lineTotal as Money),
      '0',
    );

    const shippingTotal = await this.computeShippingTotal(
      companyId,
      cart,
      items,
    );

    const discountTotal: Money = '0';
    const taxTotal: Money = '0';

    const total = this.addMoney(
      this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal),
      this.negMoney(discountTotal),
    );

    const before = {
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      taxTotal: cart.taxTotal,
      shippingTotal: cart.shippingTotal,
      total: cart.total,
      originInventoryLocationId: cart.originInventoryLocationId ?? null,
    };

    await this.db
      .update(carts)
      .set({
        subtotal,
        discountTotal,
        taxTotal,
        shippingTotal,
        total,
        totalsBreakdown: {
          meta: {
            ...(meta ?? {}),
            originInventoryLocationId: resolvedOriginLocationId ?? null,
            originSource: 'inventory_items_single_location',
          },
          computedAt: new Date().toISOString(),
          subtotal,
          shippingTotal,
          discountTotal,
          taxTotal,
        },
        updatedAt: new Date(),
      })
      .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
      .execute();

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'cart',
        entityId: cartId,
        userId: user.id,
        ipAddress: ip,
        details: 'Recalculated cart totals',
        changes: {
          companyId,
          cartId,
          before,
          after: {
            subtotal,
            discountTotal,
            taxTotal,
            shippingTotal,
            total,
            originInventoryLocationId: resolvedOriginLocationId ?? null,
          },
          meta: meta ?? null,
        },
      });
    }

    return this.cartQuery.getCart(companyId, storeId, cartId);
  }

  // -----------------------------
  // MOVED: computeShippingTotal (unchanged)
  // -----------------------------
  private async computeShippingTotal(
    companyId: string,
    cart: any,
    items: Array<{ quantity: number; weightKg: WeightValue }>,
  ): Promise<Money> {
    if (!cart.selectedShippingRateId) return '0';

    const rate = await this.db.query.shippingRates.findFirst({
      where: and(
        eq(shippingRates.companyId, companyId),
        eq(shippingRates.id, cart.selectedShippingRateId),
        eq(shippingRates.isActive, true),
      ),
    });

    if (!rate) return '0';

    const calc = (rate.calc as string) ?? 'flat';

    if (calc === 'flat') {
      return (rate.flatAmount as Money) ?? '0';
    }

    if (calc === 'weight') {
      const totalWeightGrams = items.reduce((sum, it) => {
        const kg = it.weightKg == null ? 0 : Number(it.weightKg);
        const grams = Number.isFinite(kg) ? Math.round(kg * 1000) : 0;
        return sum + grams * Number(it.quantity ?? 0);
      }, 0);

      const tiers = await this.db
        .select()
        .from(shippingRateTiers)
        .where(
          and(
            eq(shippingRateTiers.companyId, companyId),
            eq(shippingRateTiers.rateId, rate.id),
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

    return '0';
  }

  // -----------------------------
  // MOVED: assertHasWarehouse (unchanged)
  // -----------------------------
  private async assertHasWarehouse(companyId: string) {
    const row = await this.db.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.companyId, companyId),
        eq(inventoryLocations.type, 'warehouse'),
        eq(inventoryLocations.isActive, true),
      ),
    });

    if (!row) {
      throw new BadRequestException(
        'No warehouse configured. Please create an active warehouse location to fulfill online orders.',
      );
    }
  }

  // -----------------------------
  // MOVED: getWarehouseLocationId (unchanged)
  // -----------------------------
  private async getWarehouseLocationId(companyId: string, storeId: string) {
    const warehouse = await this.db.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.companyId, companyId),
        eq(inventoryLocations.storeId, storeId),
        eq(inventoryLocations.type, 'warehouse'),
      ),
    });
    if (!warehouse)
      throw new BadRequestException('Warehouse location not configured');
    return warehouse.id;
  }

  // -----------------------------
  // MOVED: resolveOriginInventoryLocationId (unchanged)
  // -----------------------------
  private async resolveOriginInventoryLocationId(
    companyId: string,
    items: Array<{ variantId: string | null; quantity: number }>,
  ): Promise<string | null> {
    const missingVariant = items.some((it) => !it.variantId);
    if (missingVariant) return null;

    const requiredQtyByVariant = new Map<string, number>();
    for (const it of items) {
      const vid = it.variantId!;
      requiredQtyByVariant.set(
        vid,
        (requiredQtyByVariant.get(vid) ?? 0) + Number(it.quantity ?? 0),
      );
    }

    const variantIds = Array.from(requiredQtyByVariant.keys());
    if (variantIds.length === 0) return null;

    await this.assertHasWarehouse(companyId);

    const rows = await this.db
      .select({
        variantId: inventoryItems.productVariantId,
        locationId: inventoryItems.locationId,
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

          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.type, 'warehouse'),
          eq(inventoryLocations.isActive, true),
        ),
      )
      .execute();

    if (rows.length === 0) return null;

    const sellableByLocation = new Map<string, Map<string, number>>();
    for (const r of rows) {
      const sellable =
        Number(r.available ?? 0) -
        Number(r.reserved ?? 0) -
        Number(r.safetyStock ?? 0);

      const locMap =
        sellableByLocation.get(r.locationId) ?? new Map<string, number>();

      locMap.set(r.variantId, Math.max(locMap.get(r.variantId) ?? 0, sellable));
      sellableByLocation.set(r.locationId, locMap);
    }

    let bestLocationId: string | null = null;
    let bestScore = -Infinity;

    for (const [locationId, locMap] of sellableByLocation.entries()) {
      let ok = true;
      let score = 0;

      for (const [variantId, requiredQty] of requiredQtyByVariant.entries()) {
        const sellable = locMap.get(variantId) ?? 0;
        if (sellable < requiredQty) {
          ok = false;
          break;
        }
        score += sellable - requiredQty;
      }

      if (ok && score > bestScore) {
        bestScore = score;
        bestLocationId = locationId;
      }
    }

    return bestLocationId;
  }

  // -----------------------------
  // MOVED: resolveZone / rates helpers (unchanged)
  // -----------------------------
  private async resolveZone(
    companyId: string,
    countryCode: string,
    state?: string,
    area?: string,
  ) {
    const rows = await this.db
      .select({
        zoneId: shippingZoneLocations.zoneId,
        priority: shippingZones.priority,
      })
      .from(shippingZoneLocations)
      .leftJoin(
        shippingZones,
        eq(shippingZones.id, shippingZoneLocations.zoneId),
      )
      .where(
        and(
          eq(shippingZoneLocations.companyId, companyId),
          eq(shippingZoneLocations.countryCode, countryCode),
          ...(state ? [eq(shippingZoneLocations.regionCode, state)] : []),
          ...(area ? [eq(shippingZoneLocations.area, area)] : []),
          eq(shippingZones.isActive, true),
        ),
      )
      .orderBy(desc(shippingZones.priority))
      .execute();

    if (rows.length > 0) {
      return await this.db.query.shippingZones.findFirst({
        where: eq(shippingZones.id, rows[0].zoneId),
      });
    }

    if (area) return this.resolveZone(companyId, countryCode, state, undefined);
    if (state)
      return this.resolveZone(companyId, countryCode, undefined, undefined);
    return null;
  }

  private async getRateByIdOrThrow(
    companyId: string,
    rateId: string,
    zoneId: string,
  ) {
    const rate = await this.db.query.shippingRates.findFirst({
      where: and(
        eq(shippingRates.companyId, companyId),
        eq(shippingRates.id, rateId),
        eq(shippingRates.zoneId, zoneId),
        eq(shippingRates.isActive, true),
      ),
    });
    if (!rate)
      throw new BadRequestException('Shipping rate not found for zone');
    return rate;
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
      const carrierRate = await this.db.query.shippingRates.findFirst({
        where: and(baseWhere, eq(shippingRates.carrierId, carrierId)),
      });
      if (carrierRate) return carrierRate;
    }

    const defaultRate = await this.db.query.shippingRates.findFirst({
      where: and(
        baseWhere,
        isNull(shippingRates.carrierId),
        eq(shippingRates.isDefault, true),
      ),
    });
    if (defaultRate) return defaultRate;

    return await this.db.query.shippingRates.findFirst({
      where: baseWhere,
      orderBy: (t, { desc }) => [desc(t.priority)],
    });
  }

  // -----------------------------
  // MOVED: money helpers (unchanged)
  // -----------------------------
  private addMoney(a: Money, b: Money): Money {
    const x = Number(a ?? '0');
    const y = Number(b ?? '0');
    return (x + y).toFixed(2);
  }

  private negMoney(a: Money): Money {
    const x = Number(a ?? '0');
    return (-x).toFixed(2);
  }

  private mulMoney(unit: Money, qty: number): Money {
    const x = Number(unit ?? '0');
    return (x * Number(qty ?? 0)).toFixed(2);
  }
}
