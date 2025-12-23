import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, desc, isNull, inArray, sql, ilike, or } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { CacheService } from 'src/common/cache/cache.service';
import { AuditService } from 'src/modules/audit/audit.service';
import { User } from 'src/common/types/user.type';
import {
  carts,
  cartItems,
  products,
  productVariants,
  shippingZones,
  shippingZoneLocations,
  shippingRates,
  shippingRateTiers,
  inventoryItems,
  inventoryLocations,
  productImages,
} from 'src/drizzle/schema';
import { CreateCartDto, AddCartItemDto, UpdateCartItemDto } from './dto';
import { TokenGeneratorService } from '../../auth/services';

type Money = string; // stored as numeric string from pg
type WeightValue = string | number | null;

@Injectable()
export class CartService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly tokenGenerator: TokenGeneratorService,
  ) {}

  async getCartByIdOnlyOrThrow(companyId: string, cartId: string) {
    const cart = await this.db.query.carts.findFirst({
      where: and(eq(carts.companyId, companyId), eq(carts.id, cartId)),
    });

    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  // -----------------------------
  // Core getters
  // -----------------------------
  async getCartByIdOrThrow(companyId: string, storeId: string, cartId: string) {
    const cart = await this.db.query.carts.findFirst({
      where: and(
        eq(carts.companyId, companyId),
        eq(carts.storeId, storeId), // ✅ store scope
        eq(carts.id, cartId),
      ),
    });

    if (!cart) throw new NotFoundException('Cart not found');
    return cart;
  }

  // in CartService
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
      })
      .from(cartItems)
      .innerJoin(
        products,
        and(
          eq(products.id, cartItems.productId),
          eq(products.companyId, companyId),
          eq(products.storeId, storeId), // ✅ prevents cross-store items
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
      .where(
        and(eq(cartItems.companyId, companyId), eq(cartItems.cartId, cartId)),
      )
      .execute();

    return items;
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

    // NOTE: drizzle “ilike” works on postgres; if not, use sql`...`
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

        // Optional: return a totalCount for pagination
        const [{ count }] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(carts)
          .where(where as any)
          .execute();

        return { rows, count: Number(count ?? 0), limit, offset };
      },
    );
  }

  // -----------------------------
  // Create cart
  // -----------------------------
  async createCart(
    companyId: string,
    storeId: string,
    dto: CreateCartDto,
    user?: User,
    ip?: string,
  ) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24);
    const ownerType = dto.customerId ? 'customer' : 'guest';

    const channel: 'online' | 'pos' =
      dto.channel ?? (dto.originInventoryLocationId ? 'pos' : 'online');

    if (channel === 'pos' && !dto.originInventoryLocationId) {
      throw new BadRequestException(
        'POS cart requires originInventoryLocationId',
      );
    }

    const payload = {
      email: dto.customerId || 'guest',
      sub: dto.customerId,
    };

    const token = await this.tokenGenerator.generateTempToken(payload);

    const [cart] = await this.db
      .insert(carts)
      .values({
        companyId,
        storeId: storeId,
        ownerType,
        customerId: dto.customerId ?? null,
        guestToken: token,
        status: 'active',
        channel, // ✅ new
        originInventoryLocationId: dto.originInventoryLocationId ?? null, // ✅ new

        currency: dto.currency ?? 'NGN',
        subtotal: '0',
        discountTotal: '0',
        taxTotal: '0',
        shippingTotal: '0',
        total: '0',
        lastActivityAt: now,
        expiresAt,
      })
      .returning()
      .execute();

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'create',
        entity: 'cart',
        entityId: cart.id,
        userId: user.id,
        ipAddress: ip,
        details: 'Created cart',
        changes: {
          companyId,
          cartId: cart.id,
          ownerType,
          channel,
          originInventoryLocationId: dto.originInventoryLocationId ?? null,
          customerId: dto.customerId ?? null,
          guestToken: dto.guestToken ?? null,
        },
      });
    }

    // Optional: for POS carts, you can run recalc once (shipping 0 anyway),
    // but not required since totals start at 0 and items are empty.
    return { ...cart, items: [] };
  }

  // -----------------------------
  // Get cart (cached)
  // -----------------------------
  async getCart(companyId: string, storeId: string, cartId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['carts', 'cart', 'store', storeId, cartId, 'v1'], // ✅ store-scoped cache key
      async () => {
        const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
        const items = await this.getCartItems(companyId, storeId, cartId);
        return { ...cart, items };
      },
    );
  }

  // -----------------------------
  // Item mutations
  // -----------------------------
  async addItem(
    companyId: string,
    storeId: string,
    cartId: string,
    dto: AddCartItemDto,
    user?: User,
    ip?: string,
  ) {
    // Ensure cart exists
    await this.getCartByIdOrThrow(companyId, storeId, cartId);

    const incomingQty = Number(dto.quantity ?? 0);
    if (!Number.isFinite(incomingQty) || incomingQty < 1) {
      throw new BadRequestException('Quantity must be >= 1');
    }

    const [product] = await this.db
      .select()
      .from(products)
      .where(
        and(eq(products.companyId, companyId), eq(products.slug, dto.slug)),
      );

    // fetch product/variant snapshot
    let variant: any = null;
    if (dto.variantId) {
      variant = await this.db.query.productVariants.findFirst({
        where: and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, dto.variantId),
        ),
      });
      if (!variant) throw new BadRequestException('Variant not found');
      if (variant.productId !== product.id) {
        throw new BadRequestException('Variant does not belong to product');
      }
    }

    // enforce variant required
    if (product.productType === 'variable' && !dto.variantId) {
      throw new BadRequestException(
        'Variant is required for variable products',
      );
    }

    // snapshot fields
    const name = variant?.title
      ? `${product.name} - ${variant.title}`
      : product.name;

    const sku = variant?.sku ?? null;

    // price
    const rawPrice = this.resolveVariantPrice(variant);
    if (rawPrice == null)
      throw new BadRequestException('Missing price for item');

    const unitPrice: Money = String(rawPrice);

    // Inventory enforcement (only if we have variant + origin)
    const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);

    if (cart.channel === 'pos') {
      if (!cart.originInventoryLocationId) {
        throw new BadRequestException('POS cart requires an origin location');
      }
      if (!dto.variantId) {
        throw new BadRequestException('POS cart requires a variantId');
      }

      await this.assertInventoryAtOriginOrThrow(
        companyId,
        cart.originInventoryLocationId,
        dto.variantId,
        dto.quantity,
      );
    } else {
      // online: optional check (you can keep your current “if origin exists” logic)
      if (dto.variantId && cart.originInventoryLocationId) {
        await this.assertInventoryAtOriginOrThrow(
          companyId,
          cart.originInventoryLocationId,
          dto.variantId,
          dto.quantity,
        );
      }
    }

    const now = new Date();

    const mergeWhere = dto.variantId
      ? and(
          eq(cartItems.companyId, companyId),
          eq(cartItems.cartId, cartId),
          eq(cartItems.variantId, dto.variantId),
        )
      : and(
          eq(cartItems.companyId, companyId),
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, dto.productId),
          isNull(cartItems.variantId),
        );

    const updateExisting = async () => {
      const updatedRows = await this.db
        .update(cartItems)
        .set({
          // keep snapshot current
          name,
          sku,
          unitPrice,

          quantity: sql<number>`${cartItems.quantity} + ${incomingQty}`,

          lineSubtotal: sql`
            (${unitPrice}::numeric) *
            (${cartItems.quantity} + ${incomingQty})::numeric
          `,

          lineTotal: sql`
            (${unitPrice}::numeric) *
            (${cartItems.quantity} + ${incomingQty})::numeric
          `,

          updatedAt: now,
        })
        .where(mergeWhere)
        .returning({ id: cartItems.id })
        .execute();

      return updatedRows?.[0]?.id ?? null;
    };

    const insertNew = async () => {
      const lineSubtotal = this.mulMoney(unitPrice, incomingQty);

      const inserted = await this.db
        .insert(cartItems)
        .values({
          companyId,
          cartId,
          productId: product.id,
          variantId: dto.variantId ?? null,
          sku,
          name,
          quantity: incomingQty,
          unitPrice,
          lineSubtotal,
          lineDiscountTotal: '0',
          lineTaxTotal: '0',
          lineTotal: lineSubtotal,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: cartItems.id })
        .execute();

      return inserted?.[0]?.id ?? null;
    };

    // ✅ Transaction: try update, else insert, if insert races -> update again
    let cartItemId: string | null = null;

    await this.db.transaction(async (tx) => {
      // swap db to tx for operations inside transaction
      const prevDb = this.db as any;
      (this as any).db = tx;

      try {
        cartItemId = await updateExisting();

        if (!cartItemId) {
          try {
            cartItemId = await insertNew();
          } catch (err: any) {
            // Race: someone inserted same (cartId, variantId) after our update attempt
            if (this.isUniqueViolation(err)) {
              cartItemId = await updateExisting();
            } else {
              throw err;
            }
          }
        }
      } finally {
        (this as any).db = prevDb;
      }
    });

    // touch cart activity
    await this.db
      .update(carts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
      .execute();

    // recompute totals
    const updated = await this.recalculateTotals(
      companyId,
      storeId,
      cartId,
      user,
      ip,
      {
        reason: 'ADD_ITEM',
      },
    );

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip && cartItemId) {
      await this.auditService.logAction({
        action: 'upsert',
        entity: 'cart_item',
        entityId: cartItemId,
        userId: user.id,
        ipAddress: ip,
        details: 'Added item to cart (merge if existing)',
        changes: {
          companyId,
          cartId,
          cartItemId,
          productId: dto.productId,
          variantId: dto.variantId ?? null,
          quantityAdded: incomingQty,
          unitPrice,
        },
      });
    }

    return updated;
  }

  async updateItemQuantity(
    companyId: string,
    storeId: string,
    cartId: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
    user?: User,
    ip?: string,
  ) {
    const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);

    const existing = await this.db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.companyId, companyId),
        eq(cartItems.id, cartItemId),
        eq(cartItems.cartId, cartId),
      ),
    });
    if (!existing) throw new NotFoundException('Cart item not found');

    if (cart.channel === 'pos') {
      if (!cart.originInventoryLocationId) {
        throw new BadRequestException('POS cart requires an origin location');
      }
      if (!existing.variantId) {
        throw new BadRequestException('POS cart requires a variantId');
      }

      // required qty is the new qty (not delta)
      await this.assertInventoryAtOriginOrThrow(
        companyId,
        cart.originInventoryLocationId,
        existing.variantId,
        dto.quantity,
      );
    }

    const newLineSubtotal = this.mulMoney(
      existing.unitPrice as Money,
      dto.quantity,
    );

    await this.db
      .update(cartItems)
      .set({
        quantity: dto.quantity,
        lineSubtotal: newLineSubtotal,
        lineTotal: newLineSubtotal, // discounts/tax later
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, cartItemId))
      .execute();

    await this.db
      .update(carts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
      .execute();

    const updated = await this.recalculateTotals(
      companyId,
      cartId,
      storeId,
      user,
      ip,
      {
        reason: 'UPDATE_QTY',
      },
    );

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'update',
        entity: 'cart_item',
        entityId: cartItemId,
        userId: user.id,
        ipAddress: ip,
        details: 'Updated cart item quantity',
        changes: {
          companyId,
          cartId,
          cartItemId,
          beforeQty: existing.quantity,
          afterQty: dto.quantity,
        },
      });
    }

    return updated;
  }

  async removeItem(
    companyId: string,
    storeId: string,
    cartId: string,
    cartItemId: string,
    user?: User,
    ip?: string,
  ) {
    await this.getCartByIdOrThrow(companyId, storeId, cartId);

    const existing = await this.db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.companyId, companyId),
        eq(cartItems.id, cartItemId),
        eq(cartItems.cartId, cartId),
      ),
    });
    if (!existing) throw new NotFoundException('Cart item not found');

    await this.db
      .delete(cartItems)
      .where(
        and(eq(cartItems.companyId, companyId), eq(cartItems.id, cartItemId)),
      )
      .execute();

    await this.db
      .update(carts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
      .execute();

    const updated = await this.recalculateTotals(
      companyId,
      cartId,
      storeId,
      user,
      ip,
      {
        reason: 'REMOVE_ITEM',
      },
    );

    await this.cache.bumpCompanyVersion(companyId);

    if (user && ip) {
      await this.auditService.logAction({
        action: 'delete',
        entity: 'cart_item',
        entityId: cartItemId,
        userId: user.id,
        ipAddress: ip,
        details: 'Removed item from cart',
        changes: {
          companyId,
          cartId,
          cartItemId,
          removed: {
            productId: existing.productId,
            variantId: existing.variantId,
            quantity: existing.quantity,
          },
        },
      });
    }

    return updated;
  }

  // ------------------------------
  //. Claim the cart
  // -----------------------------
  async claimGuestCart(
    companyId: string,
    storeId: string,
    customerId: string,
    guestToken: string,
    user?: User,
    ip?: string,
  ) {
    if (!guestToken?.trim()) {
      throw new BadRequestException('Missing guestToken');
    }

    const now = new Date();

    return this.db.transaction(async (tx) => {
      const cart = await tx.query.carts.findFirst({
        where: and(
          eq(carts.companyId, companyId),
          eq(carts.guestToken, guestToken),
          eq(carts.status, 'active' as any),
        ),
        // optional: pick most recent if duplicates exist
        orderBy: (t, { desc }) => [desc(t.lastActivityAt)],
      });

      if (!cart) throw new NotFoundException('Guest cart not found');

      // If already claimed by this customer, just return
      if (
        cart.customerId === customerId &&
        cart.ownerType === ('customer' as any)
      ) {
        await this.cache.bumpCompanyVersion(companyId);
        return this.getCart(companyId, storeId, cart.id);
      }

      await tx
        .update(carts)
        .set({
          ownerType: 'customer' as any,
          customerId,
          lastActivityAt: now,
          updatedAt: now,
        })
        .where(and(eq(carts.companyId, companyId), eq(carts.id, cart.id)))
        .execute();

      await this.cache.bumpCompanyVersion(companyId);

      if (user && ip) {
        await this.auditService.logAction({
          action: 'update',
          entity: 'cart',
          entityId: cart.id,
          userId: user.id,
          ipAddress: ip,
          details: 'Claimed guest cart (reassigned to customer)',
          changes: { companyId, cartId: cart.id, customerId, guestToken },
        });
      }

      return this.getCart(companyId, storeId, cart.id);
    });
  }

  // -----------------------------
  // Unique violation helper
  // -----------------------------
  private isUniqueViolation(err: any): boolean {
    // Postgres unique violation
    return err?.code === '23505';
  }

  // -----------------------------
  // Inventory helpers
  // -----------------------------

  private async assertInventoryAtOriginOrThrow(
    companyId: string,
    originLocationId: string,
    variantId: string,
    requiredQty: number,
  ) {
    const row = await this.db.query.inventoryItems.findFirst({
      where: and(
        eq(inventoryItems.companyId, companyId),
        eq(inventoryItems.locationId, originLocationId),
        eq(inventoryItems.productVariantId, variantId),
      ),
    });
    console.log(originLocationId);
    const sellable =
      Number(row?.available ?? 0) -
      Number(row?.reserved ?? 0) -
      Number(row?.safetyStock ?? 0);

    if (sellable < requiredQty) {
      throw new BadRequestException(
        `Insufficient stock at origin location for variant selected`,
      );
    }
  }

  // -----------------------------
  // Price Helper
  // -----------------------------
  private resolveVariantPrice(variant: any): string | null {
    if (!variant) return null;

    const saleRaw = variant.salePrice ?? variant.sale_price ?? null;
    const regularRaw = variant.regularPrice ?? variant.regular_price ?? null;
    const priceRaw = variant.price ?? null;

    const sale =
      saleRaw != null && String(saleRaw) !== '' ? Number(saleRaw) : null;
    const regular =
      regularRaw != null && String(regularRaw) !== ''
        ? Number(regularRaw)
        : priceRaw != null && String(priceRaw) !== ''
          ? Number(priceRaw)
          : null;

    if (
      sale != null &&
      Number.isFinite(sale) &&
      regular != null &&
      sale < regular
    ) {
      return String(saleRaw);
    }

    if (regularRaw != null && String(regularRaw) !== '')
      return String(regularRaw);
    if (priceRaw != null && String(priceRaw) !== '') return String(priceRaw);
    return null;
  }

  // -----------------------------
  // Expiry helpers
  // -----------------------------
  // async setCartExpiry(
  //   companyId: string,
  //   cartId: string,
  //   dto: SetCartExpiryDto,
  //   user?: User,
  //   ip?: string,
  // ) {
  //   const cart = await this.getCartByIdOrThrow(companyId, cartId);
  //   const expiresAt = new Date(Date.now() + dto.minutes * 60 * 1000);

  //   await this.db
  //     .update(carts)
  //     .set({ expiresAt, updatedAt: new Date() })
  //     .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
  //     .execute();

  //   await this.cache.bumpCompanyVersion(companyId);

  //   if (user && ip) {
  //     await this.auditService.logAction({
  //       action: 'update',
  //       entity: 'cart',
  //       entityId: cartId,
  //       userId: user.id,
  //       ipAddress: ip,
  //       details: 'Updated cart expiry',
  //       changes: {
  //         companyId,
  //         cartId,
  //         beforeExpiresAt: cart.expiresAt,
  //         afterExpiresAt: expiresAt,
  //       },
  //     });
  //   }

  //   return this.getCart(companyId, storeId, cartId);
  // }

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
  // Totals engine
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

    // ✅ enforce at least one warehouse exists for the merchant
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
      // ✅ only allow warehouse locations
      .innerJoin(
        inventoryLocations,
        eq(inventoryLocations.id, inventoryItems.locationId),
      )
      .where(
        and(
          eq(inventoryItems.companyId, companyId),
          inArray(inventoryItems.productVariantId, variantIds),

          // ✅ warehouse-only + active
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

  private async recalculateTotals(
    companyId: string,
    storeId: string,
    cartId: string,
    user?: User,
    ip?: string,
    meta?: Record<string, any>,
  ) {
    const cart = await this.getCartByIdOrThrow(companyId, storeId, cartId);
    const items = await this.getCartItems(companyId, storeId, cartId);

    let resolvedOriginLocationId: string | null = null;

    // Resolve origin from inventory_items
    if (cart.channel === 'pos' && cart.originInventoryLocationId) {
      resolvedOriginLocationId = cart.originInventoryLocationId;
    } else {
      // Online: derive origin from inventory feasibility
      resolvedOriginLocationId = await this.resolveOriginInventoryLocationId(
        companyId,
        items.map((it) => ({
          variantId: it.variantId ?? null,
          quantity: Number(it.quantity ?? 0),
        })),
      );
    }

    // Persist origin on cart if it changed (or clear if none)
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

    // subtotal = sum(line totals
    const subtotal = items.reduce(
      (sum, it) => this.addMoney(sum, it.lineTotal as Money),
      '0',
    );

    // shipping = compute from selected rate (flat or weight tiers)
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

    return this.getCart(companyId, storeId, cartId);
  }

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
      // ✅ Normalize: numeric kg -> integer grams (safe for tiers)
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
  // Zone & rate selection
  // -----------------------------
  private async resolveZone(
    companyId: string,
    countryCode: string,
    state?: string,
    area?: string,
  ) {
    // Nigeria-first matching order:
    // 1) NG + state + area
    // 2) NG + state
    // 3) NG (country only)
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

    // fallback: try without area
    if (area) {
      return this.resolveZone(companyId, countryCode, state, undefined);
    }
    // fallback: try country-only
    if (state) {
      return this.resolveZone(companyId, countryCode, undefined, undefined);
    }
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
    // preferred order:
    // 1) carrier match (if provided)
    // 2) zone default (carrierId null + isDefault=true)
    // 3) any active rate by priority
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
  // Money helpers (numeric strings)
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
