// cart-query.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, desc, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import {
  carts,
  cartItems,
  products,
  productVariants,
  productImages,
  inventoryItems,
} from 'src/infrastructure/drizzle/schema';

@Injectable()
export class CartQueryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  async getCartByIdOnlyOrThrow(companyId: string, cartId: string) {
    const cart = await this.db.query.carts.findFirst({
      where: and(eq(carts.companyId, companyId), eq(carts.id, cartId)),
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  async getCartByIdOrThrow(companyId: string, storeId: string, cartId: string) {
    const cart = await this.db.query.carts.findFirst({
      where: and(
        eq(carts.companyId, companyId),
        eq(carts.storeId, storeId),
        eq(carts.id, cartId),
      ),
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  async getCartByGuestTokenOrThrow(companyId: string, guestToken: string) {
    const cart = await this.db.query.carts.findFirst({
      where: and(
        eq(carts.companyId, companyId),
        eq(carts.guestToken, guestToken),
        eq(carts.status, 'active' as any),
      ),
    });
    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  async getCartItems(companyId: string, storeId: string, cartId: string) {
    const items = await this.db
      .select({
        id: cartItems.id,
        cartId: cartItems.cartId,
        productId: cartItems.productId,
        variantId: cartItems.variantId,
        name: cartItems.name,
        sku: cartItems.sku,
        quantity: cartItems.quantity,
        unitPrice: cartItems.unitPrice,
        lineTotal: cartItems.lineTotal,

        weightKg: productVariants.weight,
        variantTitle: productVariants.title,
        image: productImages.url,
        slug: products.slug,
        cartItemId: cartItems.id,

        // ✅ INVENTORY
        availableQty: sql<number>`COALESCE(SUM(${inventoryItems.available}), 0)`,
        reservedQty: sql<number>`COALESCE(SUM(${inventoryItems.reserved}), 0)`,
        safetyStock: sql<number>`COALESCE(SUM(${inventoryItems.safetyStock}), 0)`,
      })
      .from(cartItems)
      .innerJoin(
        products,
        and(
          eq(products.id, cartItems.productId),
          eq(products.companyId, companyId),
          eq(products.storeId, storeId),
        ),
      )
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.id, cartItems.variantId),
          eq(productVariants.companyId, companyId),
        ),
      )
      .leftJoin(productImages, eq(productImages.id, productVariants.imageId))
      .leftJoin(
        inventoryItems,
        and(
          eq(inventoryItems.companyId, companyId),
          eq(inventoryItems.storeId, storeId),
          eq(inventoryItems.productVariantId, cartItems.variantId),
        ),
      )
      .where(
        and(eq(cartItems.companyId, companyId), eq(cartItems.cartId, cartId)),
      )
      .groupBy(
        cartItems.id,
        cartItems.cartId,
        cartItems.productId,
        cartItems.variantId,
        cartItems.name,
        cartItems.sku,
        cartItems.quantity,
        cartItems.unitPrice,
        cartItems.lineTotal,
        productVariants.weight,
        productVariants.title,
        productImages.url,
        products.slug,
        cartItems.id,
      )
      .execute();

    return items.map((it) => {
      const qtyInCart = Number(it.quantity ?? 0);

      const available = Number(it.availableQty ?? 0);
      const reserved = Number(it.reservedQty ?? 0);
      const safetyStock = Number(it.safetyStock ?? 0);

      // ✅ sellable right now (what FE should allow adding/increasing)
      const sellableQty = Math.max(0, available - reserved - safetyStock);

      // ✅ IMPORTANT:
      // maxQty must include current qty (so select can render current value even if sellable is 0)
      const maxQty = Math.max(qtyInCart, sellableQty);

      return {
        ...it,

        availableQty: available,
        reservedQty: reserved,
        safetyStock,
        sellableQty,

        // FE expects maxQty
        maxQty,

        // stockStatus should reflect sellable (but don't mark out-of-stock if user already has it)
        stockStatus:
          sellableQty > 0 || qtyInCart > 0 ? 'instock' : 'outofstock',
      };
    });
  }

  async listCarts(
    companyId: string,
    q?: {
      status?: string;
      search?: string;
      customerId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const limit = Math.min(Number(q?.limit ?? 50), 200);
    const offset = Number(q?.offset ?? 0);

    const where = and(
      eq(carts.companyId, companyId),
      q?.status ? eq(carts.status, q.status as any) : undefined,
      q?.customerId ? eq(carts.customerId, q.customerId) : undefined,
      q?.search
        ? or(
            ilike(carts.guestToken, `%${q.search}%`),
            ilike(carts.id, `%${q.search}%`),
            ilike(carts.customerId, `%${q.search}%`),
          )
        : undefined,
    );

    return this.cache.getOrSetVersioned(
      companyId,
      [
        'carts',
        'list',
        'v1',
        q?.status ?? 'all',
        q?.customerId ?? 'all',
        q?.search ?? '',
        String(limit),
        String(offset),
      ],
      async () => {
        const rows = await this.db
          .select({
            id: carts.id,
            cartId: carts.cartId,
            status: carts.status,
            ownerType: carts.ownerType,
            customerId: carts.customerId,
            guestToken: carts.guestToken,
            currency: carts.currency,
            subtotal: carts.subtotal,
            shippingTotal: carts.shippingTotal,
            total: carts.total,
            selectedShippingMethodLabel: carts.selectedShippingMethodLabel,
            lastActivityAt: carts.lastActivityAt,
            expiresAt: carts.expiresAt,
            createdAt: carts.createdAt,
          })
          .from(carts)
          .where(where as any)
          .orderBy(desc(carts.lastActivityAt))
          .limit(limit)
          .offset(offset)
          .execute();

        const [{ count }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(carts)
          .where(where as any)
          .execute();

        return { rows, count: Number(count ?? 0), limit, offset };
      },
    );
  }

  async getCart(companyId: string, storeId: string, cartId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['carts', 'cart', 'store', storeId, cartId, 'v1'],
      async () => {
        const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
        const items = await this.getCartItems(companyId, storeId, cartId);
        return { ...cart, items };
      },
    );
  }
}
