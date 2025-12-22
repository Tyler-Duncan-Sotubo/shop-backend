import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
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
} from 'src/drizzle/schema'; // adjust barrel exports
import { CartService } from 'src/modules/commerce/cart/cart.service';
import { ShippingRatesService } from 'src/modules/fulfillment/shipping/services/shipping-rates.service';
import { ShippingZonesService } from 'src/modules/fulfillment/shipping/services/shipping-zones.service';
import { CreateCheckoutFromCartDto } from './dto/create-checkout-from-cart.dto';
import { SetCheckoutShippingDto } from './dto/set-checkout-shipping.dto';
import { SetCheckoutPickupDto } from './dto/set-checkout-pickup.dto';
import { ListCheckoutsDto } from './dto/list-checkouts.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { randomUUID } from 'crypto';
import { InvoiceService } from 'src/modules/billing/invoice/invoice.service';

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
  ) {
    // return existing checkout for cart if present
    const existing = await this.db.query.checkouts?.findFirst?.({
      where: and(
        eq(checkouts.companyId, companyId),
        eq(checkouts.cartId, cartId),
      ),
    });

    if (existing) {
      if (existing.status === 'locked' || existing.status === 'completed') {
        return this.getCheckout(companyId, existing.id);
      }

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

      await this.db.transaction(async (tx) => {
        await tx
          .delete(checkoutItems)
          .where(
            and(
              eq(checkoutItems.companyId, companyId),
              eq(checkoutItems.checkoutId, existing.id),
            ),
          );

        await tx.insert(checkoutItems).values(
          items.map((it) => ({
            companyId,
            checkoutId: existing.id,
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
        );

        await tx
          .update(checkouts)
          .set({
            subtotal: this.toMoney(cart.subtotal),
            discountTotal: this.toMoney((cart as any).discountTotal),
            taxTotal: this.toMoney((cart as any).taxTotal),
            shippingTotal: this.toMoney(cart.shippingTotal),
            total: this.toMoney(cart.total),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(checkouts.companyId, companyId),
              eq(checkouts.id, existing.id),
            ),
          );
      });

      return this.getCheckout(companyId, existing.id);
    }

    // load cart + items (cart totals should already be current)
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

    const [checkout] = await this.db
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

        // snapshot money now; shipping may be set later
        subtotal: this.toMoney(cart.subtotal),
        discountTotal: this.toMoney((cart as any).discountTotal),
        taxTotal: this.toMoney((cart as any).taxTotal),
        shippingTotal: this.toMoney(cart.shippingTotal),
        total: this.toMoney(cart.total),

        expiresAt,
      })
      .returning()
      .execute();

    // snapshot items into checkout_items
    await this.db
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
          // optional: store weight/title metadata if you want
          metadata: {
            variantTitle: (it as any).variantTitle ?? null,
            weightKg: (it as any).weightKg ?? null,
          },
        })),
      )
      .execute();

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

    return this.getCheckout(companyId, checkout.id);
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
      throw new BadRequestException('Checkout has expired');
    }
  }

  private assertMutableStatusOrThrow(row: any) {
    if (row.status === 'completed')
      throw new BadRequestException('Checkout already completed');
    if (row.status === 'expired')
      throw new BadRequestException('Checkout is expired');
    if (row.status === 'cancelled')
      throw new BadRequestException('Checkout is cancelled');
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

    console.log('Resolved shipping zone:', zone);

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

      return { ...orderRow, invoice };
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
}
