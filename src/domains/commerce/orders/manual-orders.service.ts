import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { AuditService } from 'src/domains/audit/audit.service';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  orderEvents,
  orderItems,
  orders,
  products,
  productVariants,
} from 'src/infrastructure/drizzle/schema';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';

type TxOrDb = DbType | any;

@Injectable()
export class ManualOrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly stock: InventoryStockService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Manual/POS order creation:
   * - creates order in 'draft'
   * - totals start at 0 (computed from items)
   * - orderNumber can be generated elsewhere (counter service) or passed in later
   *
   * IMPORTANT:
   * Your orders schema has orderNumber NOT NULL.
   * If you generate orderNumber elsewhere, wire it here.
   * For now, we generate a temporary one (replace with your counter logic).
   */
  async createManualOrder(
    companyId: string,
    input: CreateManualOrderDto,
    actor?: User,
    ip?: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const outerTx = ctx?.tx;

    const run = async (tx: TxOrDb) => {
      if (!input.originInventoryLocationId) {
        throw new BadRequestException('originInventoryLocationId is required');
      }
      if (!input.currency)
        throw new BadRequestException('currency is required');

      // TEMP order number: replace with real counter allocation
      const tmpOrderNo = `MAN-${Date.now().toString(36).toUpperCase()}`;

      const [created] = await tx
        .insert(orders)
        .values({
          id: sql`gen_random_uuid()` as any, // or rely on defaultId if configured in schema
          companyId,
          orderNumber: tmpOrderNo,
          status: 'draft',
          channel: input.channel ?? 'manual',
          currency: input.currency,
          storeId: input.storeId ?? null,
          customerId: input.customerId ?? null,
          // delivery snapshots optional at draft stage
          deliveryMethodType: 'shipping',
          shippingAddress: input.shippingAddress ?? null,
          billingAddress: input.billingAddress ?? null,

          originInventoryLocationId: input.originInventoryLocationId,

          subtotal: '0.00',
          discountTotal: '0.00',
          taxTotal: '0.00',
          shippingTotal: '0.00',
          total: '0.00',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId: created.id,
        type: 'created_manual',
        fromStatus: null,
        toStatus: created.status,
        actorUserId: actor?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Manual order created',
      });

      if (actor?.id) {
        await this.audit.logAction({
          action: 'create',
          entity: 'order',
          entityId: created.id,
          userId: actor.id,
          details: 'Created manual order',
          ipAddress: ip,
          changes: {
            companyId,
            orderId: created.id,
            channel: created.channel,
            status: created.status,
            currency: created.currency,
          },
        });
      }

      return created;
    };

    const result = outerTx
      ? await run(outerTx)
      : await this.db.transaction(run);
    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  /**
   * Add item to manual order:
   * - validates order is editable (draft or pending_payment)
   * - validates variant belongs to company
   * - reserves inventory
   * - inserts order_items row
   * - recalculates totals
   */

  // ✅ Full updated addItem() with:
  // - Correct name composition: "Product Name - Variant Title"
  // - Price resolution: uses input.unitPrice ONLY if > 0, otherwise uses salePrice (>0) else regularPrice (>0)
  // - Debug log showing which fields are present + what price got chosen

  async addItem(
    companyId: string,
    input: AddManualOrderItemDto,
    actor?: User,
    ip?: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const outerTx = ctx?.tx;

    const run = async (tx: TxOrDb) => {
      const [ord] = await tx
        .select()
        .from(orders)
        .where(
          and(eq(orders.companyId, companyId), eq(orders.id, input.orderId)),
        )
        .for('update')
        .execute();

      if (!ord) throw new NotFoundException('Order not found');

      if (!this.isEditableStatus(ord.status)) {
        throw new BadRequestException('Order is not editable');
      }

      const origin = (ord as any).originInventoryLocationId;
      if (!origin) {
        throw new BadRequestException(
          'Order missing originInventoryLocationId',
        );
      }

      const qty = Math.trunc(Number(input.quantity));
      if (qty <= 0) throw new BadRequestException('Quantity must be > 0');

      // ✅ Load variant + product name
      const [row] = await tx
        .select({
          variant: productVariants,
          productName: products.name,
        })
        .from(productVariants)
        .leftJoin(
          products,
          and(
            eq(products.companyId, productVariants.companyId),
            eq(products.id, productVariants.productId),
          ),
        )
        .where(
          and(
            eq(productVariants.companyId, companyId),
            eq(productVariants.id, input.variantId),
          ),
        )
        .execute();

      if (!row?.variant) throw new BadRequestException('Variant not found');

      const variant = row.variant;

      // ✅ Derive sku
      const derivedSku = input.sku ?? (variant as any).sku ?? null;

      // ✅ Name: "Product Name - Variant Title"
      const productName = row.productName ?? null;
      const variantTitle =
        (variant as any).title ??
        (variant as any).name ??
        (variant as any).variantName ??
        null;

      const composedName =
        productName && variantTitle
          ? `${productName} - ${variantTitle}`
          : (variantTitle ?? productName ?? 'Item');

      const finalName = input.name ?? composedName;

      // ✅ Price resolution:
      // - Use input.unitPrice ONLY if > 0
      // - else salePrice if > 0
      // - else regularPrice if > 0
      //
      // NOTE: adjust these field names to your real drizzle column mappings.
      const salePriceRaw =
        (variant as any).salePrice ??
        (variant as any).saleprice ??
        (variant as any)['sale-price'] ??
        null;

      const regularPriceRaw =
        (variant as any).regularPrice ??
        (variant as any)['regular-price'] ??
        (variant as any).regular_price ??
        (variant as any)['regular_price'] ??
        null;

      const salePrice =
        salePriceRaw != null && salePriceRaw !== ''
          ? Number(salePriceRaw)
          : null;

      const regularPrice =
        regularPriceRaw != null && regularPriceRaw !== ''
          ? Number(regularPriceRaw)
          : null;

      const derivedFromVariant =
        salePrice != null && Number.isFinite(salePrice) && salePrice > 0
          ? salePrice
          : regularPrice != null &&
              Number.isFinite(regularPrice) &&
              regularPrice > 0
            ? regularPrice
            : null;

      const inputOverride =
        input.unitPrice != null &&
        Number.isFinite(Number(input.unitPrice)) &&
        Number(input.unitPrice) > 0
          ? Number(input.unitPrice)
          : null;

      const unitPrice = inputOverride ?? derivedFromVariant;

      if (unitPrice == null) {
        throw new BadRequestException(
          'Variant has no price (salePrice/regularPrice missing or zero), and no valid unitPrice override was provided',
        );
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException(
          'unitPrice must be a non-negative number',
        );
      }

      // ✅ Reserve inventory
      await this.stock.reserveForOrderInTx(
        tx,
        companyId,
        input.orderId,
        origin,
        input.variantId,
        qty,
      );

      const lineTotal = unitPrice * qty;

      const [createdItem] = await tx
        .insert(orderItems)
        .values({
          companyId,
          orderId: input.orderId,
          variantId: input.variantId,
          productId: (variant as any).productId ?? null,
          sku: derivedSku,
          name: finalName,
          quantity: qty,
          unitPrice: unitPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
          attributes: input.attributes ?? null,
          createdAt: new Date(),
        } as any)
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId: input.orderId,
        type: 'item_added',
        fromStatus: ord.status,
        toStatus: ord.status,
        actorUserId: actor?.id ?? null,
        ipAddress: ip ?? null,
        message: `Added item ${createdItem.name} x${qty}`,
      });

      await this.recalculateTotalsInTx(tx, companyId, input.orderId);

      if (actor?.id) {
        await this.audit.logAction({
          action: 'create',
          entity: 'order_item',
          entityId: createdItem.id,
          userId: actor.id,
          details: 'Added item to manual order',
          ipAddress: ip,
          changes: {
            companyId,
            orderId: input.orderId,
            itemId: createdItem.id,
            variantId: input.variantId,
            quantity: qty,
            unitPrice,
            priceSource:
              inputOverride != null
                ? 'override'
                : salePrice && salePrice > 0
                  ? 'salePrice'
                  : 'regularPrice',
            salePrice,
            regularPrice,
            finalName,
            derivedSku,
          },
        });
      }

      return createdItem;
    };

    const result = outerTx
      ? await run(outerTx)
      : await this.db.transaction(run);
    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  /**
   * Update item fields (qty/price/name/attrs):
   * - adjusts reservation delta if quantity changes
   * - updates row
   * - recalculates totals
   */
  async updateItem(
    companyId: string,
    input: UpdateManualOrderItemDto,
    actor?: User,
    ip?: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const outerTx = ctx?.tx;

    const run = async (tx: TxOrDb) => {
      const [ord] = await tx
        .select()
        .from(orders)
        .where(
          and(eq(orders.companyId, companyId), eq(orders.id, input.orderId)),
        )
        .for('update')
        .execute();

      if (!ord) throw new NotFoundException('Order not found');
      if (!this.isEditableStatus(ord.status)) {
        throw new BadRequestException('Order is not editable');
      }

      const origin = (ord as any).originInventoryLocationId;
      if (!origin)
        throw new BadRequestException(
          'Order missing originInventoryLocationId',
        );

      const [it] = await tx
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.orderId, input.orderId),
            eq(orderItems.id, input.itemId),
          ),
        )
        .execute();

      if (!it) throw new NotFoundException('Order item not found');

      const patch: any = {};

      // qty adjustment
      if (input.quantity !== undefined) {
        const newQty = Math.trunc(Number(input.quantity));
        if (newQty <= 0) throw new BadRequestException('Quantity must be > 0');

        const oldQty = Math.trunc(Number(it.quantity ?? 0));
        const delta = newQty - oldQty;

        if (delta !== 0) {
          if (!it.variantId) {
            throw new BadRequestException(
              'Cannot adjust stock: item has no variantId',
            );
          }

          if (delta > 0) {
            await this.stock.releaseReservationInTx(
              tx,
              companyId,
              origin,
              it.variantId,
              delta,
            );
          } else {
            await this.stock.releaseReservationInTx(
              tx,
              companyId,
              origin,
              it.variantId,
              Math.abs(delta),
            );
          }
        }

        patch.quantity = newQty;
      }

      // unit price update
      if (input.unitPrice !== undefined) {
        const unitPrice = Number(input.unitPrice);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new BadRequestException(
            'unitPrice must be a non-negative number',
          );
        }
        patch.unitPrice = unitPrice.toFixed(2);
      }

      if (input.name !== undefined) patch.name = input.name;
      if (input.sku !== undefined) patch.sku = input.sku;
      if (input.attributes !== undefined) patch.attributes = input.attributes;

      // recompute lineTotal using effective values
      const finalQty =
        patch.quantity !== undefined
          ? Number(patch.quantity)
          : Number(it.quantity);
      const finalUnit =
        patch.unitPrice !== undefined
          ? Number(patch.unitPrice)
          : Number(it.unitPrice);

      patch.lineTotal = (finalQty * finalUnit).toFixed(2);

      await tx
        .update(orderItems)
        .set(patch)
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.id, input.itemId),
          ),
        )
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId: input.orderId,
        type: 'item_updated',
        fromStatus: ord.status,
        toStatus: ord.status,
        actorUserId: actor?.id ?? null,
        ipAddress: ip ?? null,
        message: `Updated item ${it.name}`,
      });

      await this.recalculateTotalsInTx(tx, companyId, input.orderId);

      if (actor?.id) {
        await this.audit.logAction({
          action: 'update',
          entity: 'order_item',
          entityId: input.itemId,
          userId: actor.id,
          details: 'Updated manual order item',
          ipAddress: ip,
          changes: {
            companyId,
            orderId: input.orderId,
            itemId: input.itemId,
            patch,
          },
        });
      }

      return { ok: true };
    };

    const result = outerTx
      ? await run(outerTx)
      : await this.db.transaction(run);
    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  /**
   * Remove item:
   * - releases reservation for its quantity
   * - deletes row
   * - recalculates totals
   */
  async removeItem(
    companyId: string,
    orderId: string,
    itemId: string,
    actor?: User,
    ip?: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const outerTx = ctx?.tx;

    const run = async (tx: TxOrDb) => {
      const [ord] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!ord) throw new NotFoundException('Order not found');
      if (!this.isEditableStatus(ord.status)) {
        throw new BadRequestException('Order is not editable');
      }

      const origin = (ord as any).originInventoryLocationId;
      if (!origin)
        throw new BadRequestException(
          'Order missing originInventoryLocationId',
        );

      const [it] = await tx
        .select()
        .from(orderItems)
        .where(
          and(eq(orderItems.companyId, companyId), eq(orderItems.id, itemId)),
        )
        .execute();

      if (!it) throw new NotFoundException('Order item not found');
      if (it.orderId !== orderId)
        throw new BadRequestException('Item does not belong to order');

      if (it.variantId) {
        const qty = Math.trunc(Number(it.quantity ?? 0));
        if (qty > 0) {
          await this.stock.releaseReservationInTx(
            tx,
            companyId,
            origin,
            it.variantId,
            qty,
          );
        }
      }

      await tx.delete(orderItems).where(eq(orderItems.id, itemId)).execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'item_removed',
        fromStatus: ord.status,
        toStatus: ord.status,
        actorUserId: actor?.id ?? null,
        ipAddress: ip ?? null,
        message: `Removed item ${it.name}`,
      });

      await this.recalculateTotalsInTx(tx, companyId, orderId);

      if (actor?.id) {
        await this.audit.logAction({
          action: 'delete',
          entity: 'order_item',
          entityId: itemId,
          userId: actor.id,
          details: 'Removed item from manual order',
          ipAddress: ip,
          changes: { companyId, orderId, itemId },
        });
      }

      return { ok: true };
    };

    const result = outerTx
      ? await run(outerTx)
      : await this.db.transaction(run);
    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  /**
   * Submit order for payment: draft -> pending_payment
   */
  async submitForPayment(
    companyId: string,
    orderId: string,
    actor?: User,
    ip?: string,
    ctx?: { tx?: TxOrDb },
  ) {
    const outerTx = ctx?.tx;

    const run = async (tx: TxOrDb) => {
      const [before] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!before) throw new NotFoundException('Order not found');

      if (before.status !== 'draft') {
        throw new BadRequestException('Only draft orders can be submitted');
      }

      // ensure it has at least one item
      const items = await tx
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.orderId, orderId),
          ),
        )
        .limit(1)
        .execute();

      if (!items.length) throw new BadRequestException('Order has no items');

      // totals already computed, but safe to refresh
      await this.recalculateTotalsInTx(tx, companyId, orderId);

      const [after] = await tx
        .update(orders)
        .set({ status: 'pending_payment', updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'submitted_for_payment',
        fromStatus: before.status,
        toStatus: after.status,
        actorUserId: actor?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order submitted for payment',
      });

      if (actor?.id) {
        await this.audit.logAction({
          action: 'update',
          entity: 'order',
          entityId: orderId,
          userId: actor.id,
          details: 'Submitted manual order for payment',
          ipAddress: ip,
          changes: {
            companyId,
            orderId,
            fromStatus: before.status,
            toStatus: after.status,
          },
        });
      }

      // ✅ Create invoice as part of the submit flow
      const invoice = await this.invoiceService.createDraftFromOrder(
        {
          orderId,
          storeId: (before as any).storeId ?? null,
          currency: (before as any).currency,
          type: 'invoice',
        } as any,
        companyId,
        { tx },
      );

      return { order: after, invoice };
    };

    const result = outerTx
      ? await run(outerTx)
      : await this.db.transaction(run);
    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  // -------------------------
  // Internal helpers
  // -------------------------

  private isEditableStatus(status: string) {
    return status === 'draft' || status === 'pending_payment';
  }

  /**
   * Totals computation from order_items (simple: subtotal = sum(lineTotal))
   * discount/tax/shipping are 0 for now.
   */
  private async recalculateTotalsInTx(
    tx: TxOrDb,
    companyId: string,
    orderId: string,
  ) {
    const [{ subtotal }] = await tx
      .select({
        subtotal: sql<string>`COALESCE(SUM(${orderItems.lineTotal}), 0)::text`,
      })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.companyId, companyId),
          eq(orderItems.orderId, orderId),
        ),
      )
      .execute();

    // numeric fields stored as strings in drizzle sometimes; keep them as strings
    const subtotalStr = (subtotal ?? '0.00').toString();

    await tx
      .update(orders)
      .set({
        subtotal: subtotalStr,
        discountTotal: '0.00',
        taxTotal: '0.00',
        shippingTotal: '0.00',
        total: subtotalStr,
        updatedAt: new Date(),
      } as any)
      .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
      .execute();
  }

  async deleteManualOrder(
    companyId: string,
    orderId: string,
    actor?: User,
    ip?: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      // 1) Lock order
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // 2) Ensure manual/POS order
      if (!['manual', 'pos'].includes(order.channel as any)) {
        throw new BadRequestException(
          'Only manual or POS orders can be deleted',
        );
      }

      // 3) Enforce status rules
      if (!['draft', 'pending_payment'].includes(order.status as any)) {
        throw new BadRequestException(
          `Cannot delete order in status "${order.status}"`,
        );
      }

      // 4) Load items
      const items = await tx
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.orderId, orderId),
          ),
        )
        .execute();

      // 5) Release inventory reservations if needed
      if (order.status === 'pending_payment') {
        const origin = (order as any).originInventoryLocationId;
        if (!origin) {
          throw new BadRequestException(
            'Order missing originInventoryLocationId',
          );
        }

        for (const it of items) {
          if (!it.variantId) continue;

          const qty = Number(it.quantity ?? 0);
          if (qty <= 0) continue;

          await this.stock.releaseReservationInTx(
            tx,
            companyId,
            origin,
            it.variantId,
            qty,
          );
        }
      }

      // 6) Insert order event (before delete)
      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'deleted',
        fromStatus: order.status,
        toStatus: null,
        actorUserId: actor?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Manual order deleted',
        meta: {
          channel: order.channel,
        },
      });

      // 7) Delete order items first (FK safety)
      await tx
        .delete(orderItems)
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.orderId, orderId),
          ),
        )
        .execute();

      // 8) Delete order
      await tx
        .delete(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      // 9) Audit log
      if (actor?.id) {
        await this.audit.logAction({
          action: 'delete',
          entity: 'order',
          entityId: orderId,
          userId: actor.id,
          ipAddress: ip,
          details: 'Deleted manual order',
          changes: {
            companyId,
            orderId,
            channel: order.channel,
            status: order.status,
          },
        });
      }

      return { deleted: true };
    });

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }
}
