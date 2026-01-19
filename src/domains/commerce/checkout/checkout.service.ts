import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  MethodNotAllowedException,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  carts,
  shippingRates,
  shippingRateTiers,
  pickupLocations,
  checkouts,
  checkoutItems,
  orders,
  orderItems,
  productImages,
  orderCounters,
  orderEvents,
  payments,
} from 'src/infrastructure/drizzle/schema'; // adjust barrel exports
import { CartService } from 'src/domains/commerce/cart/cart.service';
import { ShippingRatesService } from 'src/domains/fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from 'src/domains/fulfillment/shipping/services/shipping-zones.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { ListCheckoutsDto } from './dto/list-checkouts.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { randomUUID } from 'crypto';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { CompleteCheckoutDto } from './dto/complete-checkout.dto';

type Money = string;
type CheckoutRow = typeof checkouts.$inferSelect;
type CheckoutItemRow = typeof checkoutItems.$inferSelect & {
  image: string | null;
};

type CheckoutWithItems = CheckoutRow & { items: CheckoutItemRow[] };

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly cartService: CartService,
    private readonly stock: InventoryStockService,
    private readonly rates: ShippingRatesService,
    private readonly zones: ShippingZonesService,
    private readonly invoiceService: InvoiceService,
  ) {}

  private toMoney(v: any): Money {
    if (v == null || v === '') return '0';
    return String(v);
  }

  private addMoney(a: Money, b: Money): Money {
    return (Number(a ?? '0') + Number(b ?? '0')).toFixed(2);
  }

  private computeTotalWeightGrams(
    items: Array<{ weightKg?: any; quantity: any }>,
  ) {
    return items.reduce((sum, it) => {
      const kg = it.weightKg == null ? 0 : Number(it.weightKg);
      const grams = Number.isFinite(kg) ? Math.round(kg * 1000) : 0;
      return sum + grams * Number(it.quantity ?? 0);
    }, 0);
  }

  // -----------------------
  // Create checkout from cart (idempotent)
  // -----------------------
  async createFromCart(
    companyId: string,
    storeId: string,
    cartId: string,
    dto: CreateCheckoutFromCartDto,
    user?: User,
    ip?: string,
    opts?: { tx?: any }, // ✅ NEW
  ) {
    const dbOrTx = opts?.tx ?? this.db;

    // return existing checkout for cart if present
    const existing = await dbOrTx.query.checkouts?.findFirst?.({
      where: and(
        eq(checkouts.companyId, companyId),
        eq(checkouts.cartId, cartId),
      ),
      // if you have multiple rows historically, you can add:
      // orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    });

    console.log('[checkout] createFromCart existing?', { existing });

    // Helper: time-expired?
    const isTimeExpired = (row: any) => {
      const exp = row?.expiresAt ? new Date(row.expiresAt) : null;
      return !!exp && exp.getTime() < Date.now();
    };

    // ✅ OPTION B:
    // If checkout exists but is expired (by status OR time), we "renew" the SAME row:
    // - status -> open
    // - expiresAt -> +24h
    // - resnapshot items + totals from cart
    // (This is for the case where checkouts.cartId is UNIQUE and you cannot insert a new checkout.)
    if (existing) {
      // If it's locked or completed, keep old behavior
      if (existing.status === 'locked' || existing.status === 'completed') {
        return this.getCheckout(companyId, existing.id);
      }

      const expiredByStatus = existing.status === 'expired';
      const expiredByTime = isTimeExpired(existing);

      // Load cart + items (used for both expired-renew and normal resnapshot)
      const cart = await this.cartService.getCartByIdOrThrow(
        companyId,
        storeId,
        cartId,
      );
      const items = await this.cartService.getCartItems(
        companyId,
        storeId,
        cartId,
      );

      // If cart is empty, zero totals and keep checkout open
      if (!items.length) {
        await dbOrTx
          .update(checkouts)
          .set({
            status: 'open' as any,
            subtotal: '0',
            discountTotal: '0',
            taxTotal: '0',
            shippingTotal: '0',
            total: '0',

            // (optional) clear delivery selections
            deliveryMethodType: null as any,
            pickupLocationId: null,
            shippingAddress: null,
            shippingZoneId: null,
            selectedShippingRateId: null,
            shippingMethodLabel: null,
            shippingQuote: null,

            updatedAt: new Date(),
          })
          .where(
            and(
              eq(checkouts.companyId, companyId),
              eq(checkouts.id, existing.id),
            ),
          )
          .execute();

        // Also clear snapshot items (optional but recommended)
        if (opts?.tx) {
          await opts.tx
            .delete(checkoutItems)
            .where(
              and(
                eq(checkoutItems.companyId, companyId),
                eq(checkoutItems.checkoutId, existing.id),
              ),
            )
            .execute();
        } else {
          await this.db.transaction(async (tx) => {
            await tx
              .delete(checkoutItems)
              .where(
                and(
                  eq(checkoutItems.companyId, companyId),
                  eq(checkoutItems.checkoutId, existing.id),
                ),
              )
              .execute();
          });
        }

        return this.getCheckout(companyId, existing.id);
      }

      // ✅ Renew expired checkout row (status/time)
      if (expiredByStatus || expiredByTime) {
        const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // 1) "Renew" the checkout itself
        await dbOrTx
          .update(checkouts)
          .set({
            status: 'open' as any,
            expiresAt: newExpiresAt,
            updatedAt: new Date(),
          } as any)
          .where(
            and(
              eq(checkouts.companyId, companyId),
              eq(checkouts.id, existing.id),
            ),
          )
          .execute();

        // 2) Resnapshot items + totals in SAME TX (if provided) or in a new tx
        if (opts?.tx) {
          await this.resnapshotCheckoutItemsAndTotalsInTx(
            opts.tx,
            companyId,
            existing.id,
            cart,
            items,
          );
        } else {
          await this.db.transaction(async (tx) => {
            await this.resnapshotCheckoutItemsAndTotalsInTx(
              tx,
              companyId,
              existing.id,
              cart,
              items,
            );
          });
        }

        // 3) Side effects only when NOT inside tx
        if (!opts?.tx) {
          await this.cache.bumpCompanyVersion(companyId);

          if (user && ip) {
            await this.audit.logAction({
              action: 'update',
              entity: 'checkout',
              entityId: existing.id,
              userId: user.id,
              ipAddress: ip,
              details: 'Renewed expired checkout from cart',
              changes: {
                companyId,
                cartId,
                checkoutId: existing.id,
                expiresAt: newExpiresAt.toISOString(),
              },
            });
          }
        }

        return this.getCheckout(companyId, existing.id);
      }

      // ✅ Not expired => normal resnapshot and return
      if (opts?.tx) {
        await this.resnapshotCheckoutItemsAndTotalsInTx(
          opts.tx,
          companyId,
          existing.id,
          cart,
          items,
        );
      } else {
        await this.db.transaction(async (tx) => {
          await this.resnapshotCheckoutItemsAndTotalsInTx(
            tx,
            companyId,
            existing.id,
            cart,
            items,
          );
        });
      }

      return this.getCheckout(companyId, existing.id);
    }

    // -----------------------------
    // No checkout exists => create a new one
    // -----------------------------
    const cart = await this.cartService.getCartByIdOrThrow(
      companyId,
      storeId,
      cartId,
    );
    const items = await this.cartService.getCartItems(
      companyId,
      storeId,
      cartId,
    );
    if (!items.length) throw new BadRequestException('Cart has no items');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [checkout] = await dbOrTx
      .insert(checkouts)
      .values({
        companyId,
        cartId: cart.id,
        storeId: (cart as any).storeId,
        status: 'open',
        channel: (dto.channel ?? (cart as any).channel ?? 'online') as any,
        currency: cart.currency ?? 'NGN',
        email: dto.email ?? null,
        originInventoryLocationId:
          dto.originInventoryLocationId ??
          (cart as any).originInventoryLocationId ??
          null,

        subtotal: this.toMoney(cart.subtotal),
        discountTotal: this.toMoney((cart as any).discountTotal),
        taxTotal: this.toMoney((cart as any).taxTotal),
        shippingTotal: this.toMoney(cart.shippingTotal),
        total: this.toMoney(cart.total),

        expiresAt,
      })
      .returning()
      .execute();

    console.log('[checkout] created:', { checkout });

    await dbOrTx
      .insert(checkoutItems)
      .values(
        items.map((it) => ({
          companyId,
          checkoutId: checkout.id,
          productId: it.productId,
          variantId: it.variantId,
          sku: it.sku,
          name: it.name,
          quantity: Number(it.quantity ?? 0),
          unitPrice: it.unitPrice as any,
          lineTotal: it.lineTotal as any,
          metadata: {
            variantTitle: (it as any).variantTitle ?? null,
            weightKg: (it as any).weightKg ?? null,
            image: (it as any).image ?? null,
          },
        })),
      )
      .execute();

    // ✅ only bump cache + audit when NOT inside tx
    if (!opts?.tx) {
      await this.cache.bumpCompanyVersion(companyId);

      if (user && ip) {
        await this.audit.logAction({
          action: 'create',
          entity: 'checkout',
          entityId: checkout.id,
          userId: user.id,
          ipAddress: ip,
          details: 'Created checkout from cart',
          changes: { companyId, cartId, checkoutId: checkout.id },
        });
      }
    }

    return this.getCheckout(companyId, checkout.id);
  }

  // -----------------------
  // Sync checkout items/totals from cart
  // -----------------------
  async syncFromCart(
    companyId: string,
    checkoutId: string,
    user?: User,
    ip?: string,
  ) {
    const checkout = await this.db.query.checkouts.findFirst({
      where: and(
        eq(checkouts.companyId, companyId),
        eq(checkouts.id, checkoutId),
      ),
    });

    if (!checkout) throw new NotFoundException('Checkout not found');

    this.assertMutableStatusOrThrow(checkout);
    this.assertNotExpiredOrThrow(checkout);

    // Load cart + latest cart items
    const cart = await this.cartService.getCartByIdOrThrow(
      companyId,
      checkout.storeId as any,
      checkout.cartId as any,
    );

    const items = await this.cartService.getCartItems(
      companyId,
      checkout.storeId as any,
      checkout.cartId as any,
    );

    await this.db.transaction(async (tx) => {
      // 1) Always clear checkout snapshot items
      await tx
        .delete(checkoutItems)
        .where(
          and(
            eq(checkoutItems.companyId, companyId),
            eq(checkoutItems.checkoutId, checkoutId),
          ),
        )
        .execute();

      // 2) If cart is empty, do NOT insert (Drizzle would throw).
      //    Zero totals and cancel (or keep open if you prefer).
      if (!items.length) {
        await tx
          .update(checkouts)
          .set({
            status: 'cancelled' as any, // ✅ recommended

            subtotal: '0',
            discountTotal: '0',
            taxTotal: '0',
            shippingTotal: '0',
            total: '0',

            // optional: clear delivery selections
            deliveryMethodType: '' as any,
            pickupLocationId: null,
            shippingAddress: null,
            shippingZoneId: null,
            selectedShippingRateId: null,
            shippingMethodLabel: null,
            shippingQuote: null,

            updatedAt: new Date(),
          })
          .where(
            and(
              eq(checkouts.companyId, companyId),
              eq(checkouts.id, checkoutId),
            ),
          )
          .execute();

        return;
      }

      // 3) Insert fresh snapshot items (only if non-empty)
      await tx
        .insert(checkoutItems)
        .values(
          items.map((it) => ({
            companyId,
            checkoutId,
            productId: it.productId,
            variantId: it.variantId,
            sku: it.sku,
            name: it.name,
            quantity: Number(it.quantity ?? 0),
            unitPrice: it.unitPrice as any,
            lineTotal: it.lineTotal as any,
            metadata: {
              variantTitle: (it as any).variantTitle ?? null,
              weightKg: (it as any).weightKg ?? null,
              image: (it as any).image ?? null,
            },
          })),
        )
        .execute();

      // 4) Update checkout totals from cart
      await tx
        .update(checkouts)
        .set({
          status: 'open' as any, // ensure it remains open if it was open
          subtotal: this.toMoney(cart.subtotal),
          discountTotal: this.toMoney((cart as any).discountTotal),
          taxTotal: this.toMoney((cart as any).taxTotal),
          shippingTotal: this.toMoney(cart.shippingTotal),
          total: this.toMoney(cart.total),
          updatedAt: new Date(),
        })
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .execute();
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'checkout',
        entityId: checkoutId,
        userId: user.id,
        ipAddress: ip,
        details: 'Synced checkout from cart',
        changes: {
          companyId,
          checkoutId,
          cartId: checkout.cartId,
          itemCount: items.length,
        },
      });
    }

    return this.getCheckout(companyId, checkoutId);
  }

  // -----------------------
  // Get checkout
  // -----------------------
  async getCheckout(
    companyId: string,
    checkoutId: string,
  ): Promise<CheckoutWithItems> {
    const checkout = await this.db.query.checkouts.findFirst({
      where: and(
        eq(checkouts.companyId, companyId),
        eq(checkouts.id, checkoutId),
      ),
    });

    if (!checkout) throw new NotFoundException('Checkout not found');

    const rows = await this.db
      .select({
        item: checkoutItems,
        imageUrl: productImages.url,
      })
      .from(checkoutItems)
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.variantId, checkoutItems.variantId),
        ),
      )
      .where(
        and(
          eq(checkoutItems.companyId, companyId),
          eq(checkoutItems.checkoutId, checkoutId),
        ),
      )
      .execute();

    const items: CheckoutItemRow[] = rows.map((r) => ({
      ...(r.item as any),
      image: (r.imageUrl as any) ?? null,
    }));

    return { ...(checkout as CheckoutRow), items };
  }

  // -----------------------
  // List checkouts
  // -----------------------
  async listCheckouts(companyId: string, q: ListCheckoutsDto) {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Number(q.offset ?? 0);

    const where = and(
      eq(checkouts.companyId, companyId),
      q.status ? eq(checkouts.status, q.status as any) : undefined,
      q.search
        ? or(
            ilike(checkouts.id, `%${q.search}%`),
            ilike(checkouts.cartId, `%${q.search}%`),
            ilike(checkouts.email, `%${q.search}%`),
          )
        : undefined,
    );

    const rows = await this.db
      .select()
      .from(checkouts)
      .where(where as any)
      .orderBy(desc(checkouts.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(checkouts)
      .where(where as any)
      .execute();

    return { rows, count: Number(count ?? 0), limit, offset };
  }

  private assertNotExpiredOrThrow(row: any) {
    const exp = row?.expiresAt ? new Date(row.expiresAt) : null;
    if (exp && exp.getTime() < Date.now()) {
      throw new GoneException({
        message: 'Checkout has expired',
        checkoutId: row.id,
        cartId: row.cartId,
        expiresAt: row.expiresAt,
        action: 'RECREATE_CHECKOUT',
      });
    }
  }

  private assertMutableStatusOrThrow(row: any) {
    if (!row?.status) return;

    console.log('[checkout] assertMutableStatusOrThrow', {
      status: row.status,
    });

    if (row.status === 'expired') {
      throw new GoneException({
        message: 'Checkout has expired',
        checkoutId: row.id,
        cartId: row.cartId,
        expiresAt: row.expiresAt ?? null,
        action: 'RECREATE_CHECKOUT',
      });
    }

    if (row.status === 'completed') {
      throw new MethodNotAllowedException({
        message: 'Checkout already completed',
        checkoutId: row.id,
        action: 'CHECKOUT_IMMUTABLE',
      });
    }

    if (row.status === 'cancelled') {
      throw new MethodNotAllowedException({
        message: 'Checkout is cancelled',
        checkoutId: row.id,
        action: 'CHECKOUT_IMMUTABLE',
      });
    }
  }

  // -----------------------
  // Set delivery method: SHIPPING
  // -----------------------
  async setShipping(
    companyId: string,
    checkoutId: string,
    dto: SetCheckoutShippingDto,
    user?: User,
    ip?: string,
  ) {
    const checkout = await this.getCheckout(companyId, checkoutId);
    this.assertMutableStatusOrThrow(checkout);

    // compute weight from checkout items (metadata.weightKg) OR use passed totalWeightGrams
    const items = checkout.items as any[];
    const totalWeightGrams =
      dto.totalWeightGrams ??
      this.computeTotalWeightGrams(
        items.map((it) => ({
          quantity: it.quantity,
          weightKg: it.metadata?.weightKg ?? 0,
        })),
      );

    const zone = await this.zones.resolveZone(
      companyId,
      checkout.storeId,
      dto.countryCode,
      dto.state,
      dto.area,
    );

    if (!zone)
      throw new BadRequestException('No shipping zone matches destination');

    // pick a rate: explicit shippingRateId, else best rate (carrierId optional)
    let rate: any = null;

    if (dto.shippingRateId) {
      rate = await this.db.query.shippingRates.findFirst({
        where: and(
          eq(shippingRates.companyId, companyId),
          eq(shippingRates.id, dto.shippingRateId),
          eq(shippingRates.zoneId, zone.id),
          eq(shippingRates.isActive, true),
        ),
      });
      if (!rate)
        throw new BadRequestException('Shipping rate not found for zone');
    } else {
      // reuse your service behavior (best rate)
      const quoted = await this.rates.quote(companyId, {
        storeId: checkout.storeId,
        countryCode: dto.countryCode,
        state: dto.state,
        area: dto.area,
        carrierId: dto.carrierId ?? null,
        totalWeightGrams,
      } as any);
      rate = quoted.rate;
      if (!rate) throw new BadRequestException('No shipping rate available');
    }
    // compute amount (reuse your private method logic here so we can also capture tier id)
    const calc = (rate.calc as string) ?? 'flat';
    let tierId: string | null = null;
    let amount: Money = '0';

    if (calc === 'flat') {
      amount = (rate.flatAmount as Money) ?? '0';
    } else if (calc === 'weight') {
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

      tierId = tier?.id ?? null;
      amount = (tier?.amount as Money) ?? '0';
    }

    // recompute totals based on checkout subtotal/discount/tax (discount/tax currently 0)
    const subtotal = this.toMoney(checkout.subtotal);
    const discountTotal = this.toMoney(checkout.discountTotal);
    const taxTotal = this.toMoney(checkout.taxTotal);
    const shippingTotal = this.toMoney(amount);

    const total = this.addMoney(
      this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal),
      (-Number(discountTotal)).toFixed(2),
    );

    await this.db
      .update(checkouts)
      .set({
        deliveryMethodType: 'shipping',
        pickupLocationId: null,

        shippingAddress: dto.shippingAddress,
        shippingZoneId: zone.id,
        selectedShippingRateId: rate.id,
        shippingMethodLabel: rate.name,
        shippingTotal,
        total,

        shippingQuote: {
          countryCode: dto.countryCode?.toUpperCase?.() ?? dto.countryCode,
          state: dto.state ?? null,
          area: dto.area ?? null,
          totalWeightGrams,
          calc: calc as any,
          tierId,
          carrierId: dto.carrierId ?? null,
          rateId: rate.id,
          zoneId: zone.id,
          computedAt: new Date().toISOString(),
          rateSnapshot: {
            name: rate.name,
            minDeliveryDays: rate.minDeliveryDays ?? null,
            maxDeliveryDays: rate.maxDeliveryDays ?? null,
          },
        },

        updatedAt: new Date(),
      })
      .where(
        and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'checkout',
        entityId: checkoutId,
        userId: user.id,
        ipAddress: ip,
        details: 'Set checkout delivery method to shipping',
        changes: {
          companyId,
          checkoutId,
          shippingZoneId: zone.id,
          selectedShippingRateId: rate.id,
          shippingTotal,
          total,
        },
      });
    }

    return this.getCheckout(companyId, checkoutId);
  }

  // -----------------------
  // Set delivery method: PICKUP
  // -----------------------
  async setPickup(
    companyId: string,
    checkoutId: string,
    dto: SetCheckoutPickupDto,
    user?: User,
    ip?: string,
  ) {
    const checkout = await this.getCheckout(companyId, checkoutId);
    this.assertMutableStatusOrThrow(checkout);
    this.assertNotExpiredOrThrow(checkout);

    const pickup = await this.db.query.pickupLocations.findFirst({
      where: and(
        eq(pickupLocations.companyId, companyId),
        eq(pickupLocations.storeId, checkout.storeId),
        eq(pickupLocations.id, dto.pickupLocationId),
        eq(pickupLocations.isActive, true),
      ),
    });
    if (!pickup) throw new BadRequestException('Pickup location not found');

    const subtotal = this.toMoney(checkout.subtotal);
    const discountTotal = this.toMoney(checkout.discountTotal);
    const taxTotal = this.toMoney(checkout.taxTotal);

    const shippingTotal: Money = '0';
    const total = this.addMoney(
      this.addMoney(this.addMoney(subtotal, shippingTotal), taxTotal),
      (-Number(discountTotal)).toFixed(2),
    );

    await this.db
      .update(checkouts)
      .set({
        deliveryMethodType: 'pickup',
        pickupLocationId: dto.pickupLocationId,

        // shipping fields cleared
        shippingAddress: null,
        shippingZoneId: null,
        selectedShippingRateId: null,
        shippingMethodLabel: `Pickup - ${pickup.name}`,
        shippingQuote: {
          computedAt: new Date().toISOString(),
          rateSnapshot: { name: `Pickup - ${pickup.name}` },
        },

        billingAddress:
          dto.billingAddress ?? (checkout as any).billingAddress ?? null,

        shippingTotal,
        total,
        updatedAt: new Date(),
      })
      .where(
        and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'checkout',
        entityId: checkoutId,
        userId: user.id,
        ipAddress: ip,
        details: 'Set checkout delivery method to pickup',
        changes: {
          companyId,
          checkoutId,
          pickupLocationId: dto.pickupLocationId,
          total,
        },
      });
    }

    return this.getCheckout(companyId, checkoutId);
  }

  // -----------------------
  // Lock checkout (optional step)
  // -----------------------
  async lock(companyId: string, checkoutId: string, user?: User, ip?: string) {
    const checkout = await this.getCheckout(companyId, checkoutId);
    this.assertMutableStatusOrThrow(checkout);
    this.assertNotExpiredOrThrow(checkout);

    // enforce required fields
    if (checkout.deliveryMethodType === 'shipping') {
      if (!checkout.shippingAddress)
        throw new BadRequestException('Shipping address is required');
      if (!checkout.selectedShippingRateId)
        throw new BadRequestException('Shipping rate is required');
      if (!checkout.shippingZoneId)
        throw new BadRequestException('Shipping zone is required');
    }
    if (checkout.deliveryMethodType === 'pickup') {
      if (!checkout.pickupLocationId)
        throw new BadRequestException('Pickup location is required');
    }

    await this.db
      .update(checkouts)
      .set({ status: 'locked', updatedAt: new Date() })
      .where(
        and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'update',
        entity: 'checkout',
        entityId: checkoutId,
        userId: user.id,
        ipAddress: ip,
        details: 'Locked checkout',
        changes: { companyId, checkoutId },
      });
    }

    return this.getCheckout(companyId, checkoutId);
  }

  async generateOrderNumber(tx: any, companyId: string): Promise<string> {
    const [row] = await tx
      .insert(orderCounters)
      .values({
        id: randomUUID(),
        companyId,
        nextNumber: 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: orderCounters.companyId,
        set: {
          // next_number = next_number + 1
          nextNumber: sql`${orderCounters.nextNumber} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning({ nextNumber: orderCounters.nextNumber });

    const seq = Number(row.nextNumber);
    return `ORD-${String(seq).padStart(3, '0')}`;
  }

  // -----------------------
  // Expire checkout (admin/cron)
  // -----------------------
  async expire(companyId: string, checkoutId: string) {
    await this.db
      .update(checkouts)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
      )
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
    return { ok: true };
  }

  private isUniqueViolation(err: any) {
    return err?.code === '23505';
  }

  // -----------------------
  // Complete checkout -> create order + commit inventory
  // -----------------------
  async complete(
    companyId: string,
    checkoutId: string,
    dto: CompleteCheckoutDto,
    user?: User,
    ip?: string,
  ) {
    const created = await this.db.transaction(async (tx) => {
      // 1) Lock checkout
      const [co] = await tx
        .select()
        .from(checkouts)
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .for('update')
        .execute();

      if (!co) throw new NotFoundException('Checkout not found');
      this.assertMutableStatusOrThrow(co);
      this.assertNotExpiredOrThrow(co);

      // 2) Lock cart
      const [cart] = await tx
        .select()
        .from(carts)
        .where(and(eq(carts.companyId, companyId), eq(carts.id, co.cartId)))
        .for('update')
        .execute();

      if (!cart) throw new BadRequestException('Cart not found');

      // ✅ Idempotency fast-path: cart already has an order pointer
      if ((cart as any).convertedOrderId) {
        const [existingOrder] = await tx
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.companyId, companyId),
              eq(orders.id, (cart as any).convertedOrderId),
            ),
          )
          .execute();

        if (existingOrder) return existingOrder;
        throw new BadRequestException('Cart is converted but order is missing');
      }

      // (optional fallback if you still use status)
      if ((cart as any).status === 'converted') {
        const [existingByCart] = await tx
          .select()
          .from(orders)
          .where(
            and(eq(orders.companyId, companyId), eq(orders.cartId, co.cartId)),
          )
          .execute();

        if (existingByCart) return existingByCart;
        throw new BadRequestException('Cart already converted');
      }

      // 3) Load checkout items
      const items = await tx
        .select()
        .from(checkoutItems)
        .where(
          and(
            eq(checkoutItems.companyId, companyId),
            eq(checkoutItems.checkoutId, checkoutId),
          ),
        )
        .execute();

      if (!items.length) throw new BadRequestException('Checkout has no items');

      // 4) Enforce delivery selections
      if (co.deliveryMethodType === 'shipping') {
        if (!co.shippingAddress)
          throw new BadRequestException('Shipping address is required');
        if (!co.selectedShippingRateId)
          throw new BadRequestException('Shipping rate is required');
      } else if (co.deliveryMethodType === 'pickup') {
        if (!co.pickupLocationId)
          throw new BadRequestException('Pickup location is required');
      } else {
        throw new BadRequestException('Invalid delivery method');
      }

      // 5) Determine origin (tight pickup rules)
      let origin = (co.originInventoryLocationId as any) ?? null;

      if (co.deliveryMethodType === 'pickup') {
        const pickup = await tx.query.pickupLocations.findFirst({
          where: and(
            eq(pickupLocations.companyId, companyId),
            eq(pickupLocations.id, co.pickupLocationId as any),
            eq(pickupLocations.isActive, true),
          ),
        });

        if (!pickup) throw new BadRequestException('Pickup location not found');
        if (!pickup.inventoryLocationId) {
          throw new BadRequestException(
            'Pickup location missing inventoryLocationId',
          );
        }

        origin = pickup.inventoryLocationId as any;
      }

      if (!origin) {
        throw new BadRequestException(
          'Checkout missing originInventoryLocationId',
        );
      }

      const channel = (co.channel as any) ?? 'online';
      const paymentMethodType = dto?.paymentMethodType;
      const paymentProvider = dto?.paymentProvider ?? null;

      if (!paymentMethodType) {
        throw new BadRequestException('Payment method is required');
      }

      if (paymentMethodType === 'gateway' && !paymentProvider) {
        throw new BadRequestException('Payment provider is required');
      }

      await tx
        .update(checkouts)
        .set({
          paymentMethodType: paymentMethodType as any,
          paymentProvider: paymentProvider as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .execute();

      // 6) Create order first (so we have orderId for reservations)
      let orderRow: any;
      let didCreateOrder = false;
      // generate orderNumber (because orders.orderNumber is notNull in your schema)
      const orderNumber = await this.generateOrderNumber(tx, companyId);

      // Try insert, else fetch existing by unique cartId/checkoutId
      try {
        const [order] = await tx
          .insert(orders)
          .values({
            companyId,
            orderNumber: orderNumber,
            storeId: co.storeId,
            checkoutId: co.id,
            cartId: co.cartId,

            status: channel === 'online' ? 'pending_payment' : 'paid',
            channel: co.channel as any,
            currency: co.currency,

            customerId: null,

            deliveryMethodType: co.deliveryMethodType as any,
            pickupLocationId: co.pickupLocationId ?? null,
            shippingZoneId: co.shippingZoneId ?? null,
            selectedShippingRateId: co.selectedShippingRateId ?? null,
            shippingMethodLabel: co.shippingMethodLabel ?? null,
            shippingQuote: co.shippingQuote ?? null,

            shippingAddress: co.shippingAddress ?? null,
            billingAddress: co.billingAddress ?? null,

            originInventoryLocationId: origin,

            subtotal: this.toMoney(co.subtotal),
            discountTotal: this.toMoney(co.discountTotal),
            taxTotal: this.toMoney(co.taxTotal),
            shippingTotal: this.toMoney(co.shippingTotal),
            total: this.toMoney(co.total),

            paymentMethodType: paymentMethodType as any,
            paymentProvider: paymentProvider as any,
          } as any)
          .returning()
          .execute();

        orderRow = order;
        didCreateOrder = true;
      } catch (err: any) {
        if (!this.isUniqueViolation(err)) throw err;

        // fetch by checkoutId first (strongest)
        const [existingByCheckout] = await tx
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.companyId, companyId),
              eq(orders.checkoutId, checkoutId as any),
            ),
          )
          .execute();

        if (existingByCheckout) {
          orderRow = existingByCheckout;
        } else {
          // fallback: fetch by cartId
          const [existingByCart] = await tx
            .select()
            .from(orders)
            .where(
              and(
                eq(orders.companyId, companyId),
                eq(orders.cartId, co.cartId),
              ),
            )
            .execute();

          if (existingByCart) orderRow = existingByCart;
          else throw err;
        }
      }

      // ✅ 6.1) Order event (created) — only if this request created it
      if (didCreateOrder) {
        await tx.insert(orderEvents).values({
          companyId,
          orderId: orderRow.id,
          type: 'created',
          fromStatus: null,
          toStatus: orderRow.status,
          actorUserId: user?.id ?? null,
          ipAddress: ip ?? null,
          message: 'Order created from checkout completion',
          meta: {
            checkoutId: co.id,
            cartId: co.cartId,
            channel: co.channel ?? null,
            deliveryMethodType: co.deliveryMethodType ?? null,
            originInventoryLocationId: origin ?? null,
          },
        });
      }

      // 7) Inventory commit AFTER order exists
      for (const it of items) {
        const variantId = it.variantId;
        if (!variantId) {
          throw new BadRequestException(
            'All checkout items must have variantId',
          );
        }

        const qty = Number(it.quantity ?? 0);
        if (qty <= 0) continue;

        if (channel === 'online') {
          // ✅ new signature includes orderId
          await this.stock.reserveInTx(
            tx,
            companyId,
            orderRow.id,
            origin,
            variantId,
            qty,
          );
        } else {
          // POS: deduct immediately (no reservations)
          if ((this.stock as any).deductAvailableInTx) {
            await (this.stock as any).deductAvailableInTx(
              tx,
              companyId,
              origin,
              variantId,
              qty,
            );
          } else {
            // fallback
            await this.stock.fulfillFromReservationInTx(
              tx,
              companyId,
              origin,
              variantId,
              qty,
            );
          }
        }
      }

      // 8) Insert order items (idempotent)
      const existingOrderItems = await tx
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.orderId, orderRow.id),
          ),
        )
        .limit(1)
        .execute();

      if (existingOrderItems.length === 0) {
        await tx
          .insert(orderItems)
          .values(
            items.map((it) => ({
              companyId,
              orderId: orderRow.id,
              productId: it.productId,
              variantId: it.variantId,
              sku: it.sku,
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.unitPrice as any,
              lineTotal: it.lineTotal as any,
              metadata: it.metadata as any,
              attributes: it.attributes as any,
            })),
          )
          .execute();
      }

      let invoice: any = null;

      // 8.5) ✅ Create invoice draft from the order (idempotent)
      invoice = await this.invoiceService.createDraftFromOrder(
        {
          orderId: orderRow.id,
          storeId: (orderRow as any).storeId ?? null,
          currency: orderRow.currency,
          type: 'invoice',
        } as any,
        companyId,
        { tx },
      );

      if (channel !== 'online') {
        const issued = await this.invoiceService.issueInvoice(
          invoice.id,
          {
            storeId: (orderRow as any).storeId ?? null,
            seriesName: 'POS',
            dueAt: null,
          } as any,
          companyId,
          user?.id,
          { tx },
        );

        invoice = issued;
      }

      // 8.6) ✅ Create payment record for the order (idempotent)
      // For online checkout:
      // - bank_transfer => pending payment (customer uploads evidence later)
      // - gateway => pending payment (until provider success callback updates to succeeded)
      // For POS/offline (channel !== 'online'), you already mark order paid elsewhere.

      let paymentRow: any = null;

      if (channel === 'online') {
        // Check if payment already exists for this invoice/order (idempotency)
        const [existingPayment] = await tx
          .select({ id: payments.id, status: payments.status })
          .from(payments)
          .where(
            and(
              eq(payments.companyId, companyId),
              eq(payments.invoiceId, invoice.id),
            ),
          )
          .limit(1)
          .execute();

        if (!existingPayment) {
          const amountMinor = Number(orderRow.total ?? 0) * 100;

          const status =
            paymentMethodType === 'bank_transfer' ? 'pending' : 'pending';

          const method =
            paymentMethodType === 'gateway'
              ? 'gateway'
              : (paymentMethodType as any);

          const [p] = await tx
            .insert(payments)
            .values({
              companyId,
              orderId: orderRow.id,
              invoiceId: invoice.id,
              method, // 'gateway' | 'bank_transfer' | 'cash' etc.
              provider: paymentProvider ?? null, // 'paystack' | 'stripe' | null
              status, // 'pending' for both flows here
              currency: orderRow.currency,
              amountMinor,
              reference: null,
              meta: {
                checkoutId,
                orderNumber: orderRow.orderNumber,
              },
              receivedAt: null,
              confirmedAt: null,
              createdByUserId: user?.id ?? null,
              confirmedByUserId: null,
            } as any)
            .returning()
            .execute();

          paymentRow = p;
        } else {
          paymentRow = existingPayment;
        }
      }

      // 9) Mark cart converted with pointer (key for idempotency)
      await tx
        .update(carts)
        .set({
          status: 'converted' as any,
          convertedOrderId: orderRow.id,
          updatedAt: new Date(),
        } as any)
        .where(and(eq(carts.companyId, companyId), eq(carts.id, co.cartId)))
        .execute();

      // 10) Mark checkout completed
      await tx
        .update(checkouts)
        .set({ status: 'completed', updatedAt: new Date() })
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .execute();

      return { ...orderRow, invoice, payment: paymentRow };
    });

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.audit.logAction({
        action: 'create',
        entity: 'order',
        entityId: created,
        userId: user.id,
        ipAddress: ip,
        details: 'Completed checkout -> created order',
        changes: { companyId, checkoutId, orderId: created.id },
      });
    }

    const items = await this.db
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.companyId, companyId),
          eq(orderItems.orderId, created.id),
        ),
      )
      .execute();

    return { ...created, items, invoice: created.invoice };
  }

  async refreshCheckout(
    companyId: string,
    checkoutId: string,
    storeId: string,
    dto?: Partial<{
      // keep this minimal — optional overrides if you want
      deliveryMethodType: 'shipping' | 'pickup';
      pickupLocationId: string | null;
      shippingAddress: any | null;
      billingAddress: any | null;
      originInventoryLocationId: string | null;
    }>,
  ) {
    const result = await this.db.transaction(async (tx) => {
      // 1) Load old checkout (lock so concurrent refresh/complete doesn't race)
      const [old] = await tx
        .select()
        .from(checkouts)
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .for('update')
        .execute();

      if (!old) throw new NotFoundException('Checkout not found');

      // If already completed, don't refresh
      if ((old as any).status === 'completed') {
        throw new BadRequestException('Checkout already completed');
      }

      // 2) Lock cart
      const [cart] = await tx
        .select()
        .from(carts)
        .where(
          and(
            eq(carts.companyId, companyId),
            eq(carts.id, (old as any).cartId),
          ),
        )
        .for('update')
        .execute();

      if (!cart) throw new BadRequestException('Cart not found');

      // Don’t refresh if converted
      if (
        (cart as any).convertedOrderId ||
        (cart as any).status === 'converted'
      ) {
        throw new BadRequestException('Cart already converted');
      }

      // 3) Ensure checkout still has items (optional guard)
      // If you prefer: remove this check and let createFromCart resnapshot from cart.
      const hasAnyItem = await tx
        .select({ id: checkoutItems.id })
        .from(checkoutItems)
        .where(
          and(
            eq(checkoutItems.companyId, companyId),
            eq(checkoutItems.checkoutId, checkoutId as any),
          ),
        )
        .limit(1)
        .execute();

      if (hasAnyItem.length === 0) {
        throw new BadRequestException('Checkout has no items');
      }

      // 4) Expiry check
      const exp = (old as any).expiresAt
        ? new Date((old as any).expiresAt)
        : null;
      const isExpired = !!exp && exp.getTime() < Date.now();

      if (!isExpired) {
        // ✅ idempotent refresh: do nothing if still valid
        return {
          refreshed: false,
          checkoutId: (old as any).id,
          cartId: (old as any).cartId,
          expiresAt: (old as any).expiresAt ?? null,
        };
      }

      // 5) Mark old checkout as expired (useful for debugging + history)
      await tx
        .update(checkouts)
        .set({ status: 'expired' as any, updatedAt: new Date() } as any)
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .execute();

      // 6) Create a NEW checkout from the same cart
      // ✅ IMPORTANT: call your existing createFromCart, but pass the tx (so no nested tx).
      // This assumes you've refactored createFromCart to accept opts?: { tx?: any }
      const newCheckout = await this.createFromCart(
        companyId,
        storeId,
        (old as any).cartId,
        {
          channel: (old as any).channel ?? 'online',
          currency: (old as any).currency ?? 'NGN',
          originInventoryLocationId:
            dto?.originInventoryLocationId ??
            (old as any).originInventoryLocationId ??
            (cart as any).originInventoryLocationId ??
            null,

          // Optional: carry delivery selections forward (or let user reselect)
          deliveryMethodType:
            dto?.deliveryMethodType ?? (old as any).deliveryMethodType ?? null,
          pickupLocationId:
            dto?.pickupLocationId ?? (old as any).pickupLocationId ?? null,
          shippingAddress:
            dto?.shippingAddress ?? (old as any).shippingAddress ?? null,
          billingAddress:
            dto?.billingAddress ?? (old as any).billingAddress ?? null,

          // include whatever CreateCheckoutFromCartDto expects in your codebase:
          email: (old as any).email ?? null,
        } as any,
        undefined,
        undefined,
        { tx }, // ✅ pass tx
      );

      return {
        refreshed: true,
        checkoutId: (newCheckout as any).id,
        cartId: (old as any).cartId,
        previousCheckoutId: (old as any).id,
        expiresAt: (newCheckout as any).expiresAt ?? null,
      };
    });

    return result;
  }

  private async resnapshotCheckoutItemsAndTotalsInTx(
    tx: any,
    companyId: string,
    checkoutId: string,
    cart: any,
    items: any[],
  ) {
    // 1) remove old snapshot items
    await tx
      .delete(checkoutItems)
      .where(
        and(
          eq(checkoutItems.companyId, companyId),
          eq(checkoutItems.checkoutId, checkoutId),
        ),
      )
      .execute();

    // 2) cart empty => zero totals + clear delivery fields
    if (!items.length) {
      await tx
        .update(checkouts)
        .set({
          status: 'open' as any,
          subtotal: '0',
          discountTotal: '0',
          taxTotal: '0',
          shippingTotal: '0',
          total: '0',

          deliveryMethodType: null as any,
          pickupLocationId: null,
          shippingAddress: null,
          shippingZoneId: null,
          selectedShippingRateId: null,
          shippingMethodLabel: null,
          shippingQuote: null,

          updatedAt: new Date(),
        } as any)
        .where(
          and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
        )
        .execute();

      return;
    }

    // 3) insert new snapshot items
    await tx
      .insert(checkoutItems)
      .values(
        items.map((it) => ({
          companyId,
          checkoutId,
          productId: it.productId,
          variantId: it.variantId,
          sku: it.sku,
          name: it.name,
          quantity: Number(it.quantity ?? 0),
          unitPrice: it.unitPrice as any,
          lineTotal: it.lineTotal as any,
          metadata: {
            variantTitle: (it as any).variantTitle ?? null,
            weightKg: (it as any).weightKg ?? null,
            image: (it as any).image ?? null,
          },
        })),
      )
      .execute();

    // 4) update totals
    await tx
      .update(checkouts)
      .set({
        subtotal: this.toMoney(cart.subtotal),
        discountTotal: this.toMoney((cart as any).discountTotal),
        taxTotal: this.toMoney((cart as any).taxTotal),
        shippingTotal: this.toMoney(cart.shippingTotal),
        total: this.toMoney(cart.total),
        updatedAt: new Date(),
      } as any)
      .where(
        and(eq(checkouts.companyId, companyId), eq(checkouts.id, checkoutId)),
      )
      .execute();
  }
}
