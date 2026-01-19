// cart-item-mutation.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { AuditService } from 'src/domains/audit/audit.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';

import {
  carts,
  cartItems,
  products,
  productVariants,
  inventoryLocations,
} from 'src/infrastructure/drizzle/schema';

import { CartQueryService } from './cart-query.service';
import { AddCartItemDto, UpdateCartItemDto } from '../dto';
import { CartTotalsService } from './cart-totals.service';
import { InventoryAvailabilityService } from '../../inventory/services/inventory-availability.service';

type Money = string;

@Injectable()
export class CartItemMutationService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly auditService: AuditService,
    private readonly cartQuery: CartQueryService,
    private readonly cartTotals: CartTotalsService,
    private readonly availability: InventoryAvailabilityService,
  ) {}

  async addItem(
    companyId: string,
    storeId: string,
    cartId: string,
    dto: AddCartItemDto,
    user?: User,
    ip?: string,
  ) {
    await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);

    const incomingQty = Number(dto.quantity ?? 0);
    if (!Number.isFinite(incomingQty) || incomingQty < 1) {
      throw new BadRequestException('Quantity must be >= 1');
    }

    console.log('Adding item to cart:', { companyId, storeId, cartId, dto });

    const [product] = await this.db
      .select()
      .from(products)
      .where(
        and(eq(products.companyId, companyId), eq(products.slug, dto.slug)),
      );

    if (!product) throw new BadRequestException('Product not found');

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

    if (product.productType === 'variable' && !dto.variantId) {
      throw new BadRequestException(
        'Variant is required for variable products',
      );
    }

    const name = variant?.title
      ? `${product.name} - ${variant.title}`
      : product.name;

    const sku = variant?.sku ?? null;

    const rawPrice = this.resolveVariantPrice(variant);
    if (rawPrice == null)
      throw new BadRequestException('Missing price for item');

    const unitPrice: Money = String(rawPrice);

    const cart = await this.cartQuery.getCartByIdOrThrow(
      companyId,
      storeId,
      cartId,
    );

    // Build merge key (same logic as before)
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

    // ✅ FIX: compute desiredQty (existing + incoming)
    const existingRow = await this.db.query.cartItems.findFirst({
      where: mergeWhere as any,
    });
    const existingQty = Number(existingRow?.quantity ?? 0);
    const desiredQty = existingQty + incomingQty;

    // Resolve origin
    let originLocationId = cart.originInventoryLocationId;

    if (cart.channel === 'online') {
      originLocationId = await this.availability.getWarehouseLocationId(
        companyId,
        storeId,
      );

      if (!cart.originInventoryLocationId) {
        await this.db
          .update(carts)
          .set({ originInventoryLocationId: originLocationId })
          .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
          .execute();
      }
    }

    if (cart.channel === 'pos') {
      if (!originLocationId) {
        throw new BadRequestException('POS cart requires an origin location');
      }
      if (!dto.variantId) {
        throw new BadRequestException('POS cart requires a variantId');
      }
    }

    // ✅ FIX: ALWAYS check against resolved originLocationId + desiredQty
    if (dto.variantId && originLocationId) {
      await this.availability.assertAvailable(
        companyId,
        originLocationId,
        dto.variantId,
        desiredQty,
      );
    }

    const now = new Date();

    const updateExisting = async () => {
      const updatedRows = await this.db
        .update(cartItems)
        .set({
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

    let cartItemId: string | null = null;

    await this.db.transaction(async (tx) => {
      const prevDb = this.db as any;
      (this as any).db = tx;

      try {
        cartItemId = await updateExisting();

        if (!cartItemId) {
          try {
            cartItemId = await insertNew();
          } catch (err: any) {
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

    await this.db
      .update(carts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
      .execute();

    const updated = await this.cartTotals.recalculateTotals(
      companyId,
      storeId,
      cartId,
      user,
      ip,
      { reason: 'ADD_ITEM' },
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
    const cart = await this.cartQuery.getCartByIdOrThrow(
      companyId,
      storeId,
      cartId,
    );

    const existing = await this.db.query.cartItems.findFirst({
      where: and(
        eq(cartItems.companyId, companyId),
        eq(cartItems.id, cartItemId),
        eq(cartItems.cartId, cartId),
      ),
    });
    if (!existing) throw new NotFoundException('Cart item not found');
    if (!existing.variantId) {
      throw new BadRequestException('Cart item requires a variantId');
    }

    let originLocationId = cart.originInventoryLocationId;

    if (cart.channel === 'online') {
      // keep your current behavior (warehouse per store)
      const warehouse = await this.db.query.inventoryLocations.findFirst({
        where: and(
          eq(inventoryLocations.companyId, companyId),
          eq(inventoryLocations.storeId, storeId),
          eq(inventoryLocations.type, 'warehouse'),
        ),
      });
      if (!warehouse)
        throw new BadRequestException('Warehouse location not configured');
      originLocationId = warehouse.id;

      if (!cart.originInventoryLocationId) {
        await this.db
          .update(carts)
          .set({
            originInventoryLocationId: originLocationId,
          })
          .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
          .execute();
      }
    }

    if (cart.channel === 'pos') {
      if (!originLocationId)
        throw new BadRequestException('POS cart requires an origin location');
    }

    if (originLocationId) {
      await this.availability.assertAvailable(
        companyId,
        originLocationId,
        existing.variantId,
        dto.quantity, // final qty
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
        lineTotal: newLineSubtotal,
        updatedAt: new Date(),
      })
      .where(eq(cartItems.id, cartItemId))
      .execute();

    await this.db
      .update(carts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(carts.companyId, companyId), eq(carts.id, cartId)))
      .execute();

    const updated = await this.cartTotals.recalculateTotals(
      companyId,
      storeId,
      cartId,
      user,
      ip,
      { reason: 'UPDATE_QTY' },
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
    await this.cartQuery.getCartByIdOrThrow(companyId, storeId, cartId);

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

    const updated = await this.cartTotals.recalculateTotals(
      companyId,
      storeId,
      cartId,
      user,
      ip,
      { reason: 'REMOVE_ITEM' },
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

  private isUniqueViolation(err: any): boolean {
    return err?.code === '23505';
  }

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

  private mulMoney(unit: Money, qty: number): Money {
    const x = Number(unit ?? '0');
    return (x * Number(qty ?? 0)).toFixed(2);
  }
}
