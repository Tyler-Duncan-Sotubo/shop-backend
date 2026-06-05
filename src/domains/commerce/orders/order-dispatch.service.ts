import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  companyRoles,
  orderDispatches,
  orderEvents,
  orderItems,
  orders,
  users,
} from 'src/infrastructure/drizzle/schema';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { DispatchNotificationService } from 'src/domains/notification/services/dispatch-notification.service';

type Actor = {
  id: string;
  ip?: string;
};

@Injectable()
export class OrderDispatchService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly stock: InventoryStockService,
    private readonly cache: CacheService,
    private readonly dispatchNotification: DispatchNotificationService,
  ) {}

  // ─────────────────────────────────────────────
  // Step 1 — Admin/sales requests dispatch
  // ─────────────────────────────────────────────
  async requestDispatch(
    companyId: string,
    storeId: string,
    orderId: string,
    actor: Actor,
    note?: string,
  ) {
    const dispatch = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) throw new NotFoundException('Order not found');

      if (order.storeId !== storeId) {
        throw new BadRequestException('Order does not belong to this store');
      }

      if (order.status !== 'paid' && order.status !== 'lay_buy') {
        throw new BadRequestException(
          'Only paid or lay-buy orders can be dispatched',
        );
      }

      // Guard: no duplicate pending dispatch
      const existing = await tx
        .select({ id: orderDispatches.id })
        .from(orderDispatches)
        .where(
          and(
            eq(orderDispatches.companyId, companyId),
            eq(orderDispatches.orderId, orderId),
            eq(orderDispatches.status, 'pending'),
          ),
        )
        .limit(1)
        .execute();

      if (existing.length > 0) {
        throw new BadRequestException(
          'A dispatch request is already pending for this order',
        );
      }

      // Create dispatch record
      const [dispatch] = await tx
        .insert(orderDispatches)
        .values({
          companyId,
          storeId,
          orderId,
          status: 'pending',
          requestedByUserId: actor.id,
          note: note ?? null,
        })
        .returning()
        .execute();

      // Transition order status
      await tx
        .update(orders)
        .set({ status: 'awaiting_dispatch', updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'dispatch_requested',
        fromStatus: order.status,
        toStatus: 'awaiting_dispatch',
        actorUserId: actor.id,
        ipAddress: actor.ip ?? null,
        message: 'Dispatch requested — awaiting inventory manager confirmation',
      });

      return dispatch;
    });

    // ✅ notify all inventory managers — outside transaction so email
    // failure never rolls back the dispatch
    try {
      const [actorName, managerEmails, store, orderRow, itemCountRow] =
        await Promise.all([
          this.getActorName(actor.id),
          this.getUserEmailsByRoles(companyId, ['inventory_manager']),
          this.db.query.stores.findFirst({
            columns: { name: true },
            where: (f, { and, eq }) =>
              and(eq(f.companyId, companyId), eq(f.id, storeId)),
          }),
          this.db
            .select()
            .from(orders)
            .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
            .limit(1)
            .execute()
            .then((r) => r[0] ?? null),
          this.db
            .select({ count: sql<number>`count(*)` })
            .from(orderItems)
            .where(
              and(
                eq(orderItems.companyId, companyId),
                eq(orderItems.orderId, orderId),
              ),
            )
            .execute()
            .then((r) => Number(r[0]?.count ?? 0)),
        ]);

      const shippingAddress = orderRow?.shippingAddress as any;
      const customerName = shippingAddress
        ? [shippingAddress?.firstName, shippingAddress?.lastName]
            .filter(Boolean)
            .join(' ') || null
        : null;

      await Promise.all(
        managerEmails.map((toEmail) =>
          this.dispatchNotification.sendRequestDispatchEmail({
            toEmail,
            orderNumber: orderRow?.orderNumber ?? orderId,
            orderId,
            customerName,
            itemCount: itemCountRow,
            total: orderRow?.total ?? null,
            currency: orderRow?.currency ?? null,
            requestedBy: actorName,
            storeName: store?.name ?? undefined,
            shippingAddress: shippingAddress
              ? {
                  city: shippingAddress?.city ?? null,
                  state: shippingAddress?.state ?? null,
                  country: shippingAddress?.country ?? null,
                }
              : null,
          }),
        ),
      );
    } catch (err) {
      console.error('Failed to send request dispatch emails:', err);
    }

    return dispatch;
  }

  // ─────────────────────────────────────────────
  // Step 2 — Inventory manager confirms dispatch
  // ─────────────────────────────────────────────
  async confirmDispatch(
    companyId: string,
    storeId: string,
    orderId: string,
    actor: Actor,
    note?: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) throw new NotFoundException('Order not found');

      if (order.storeId !== storeId) {
        throw new BadRequestException('Order does not belong to this store');
      }

      if (order.status !== 'awaiting_dispatch') {
        throw new BadRequestException('Order is not awaiting dispatch');
      }

      const [dispatch] = await tx
        .select()
        .from(orderDispatches)
        .where(
          and(
            eq(orderDispatches.companyId, companyId),
            eq(orderDispatches.storeId, storeId),
            eq(orderDispatches.orderId, orderId),
            eq(orderDispatches.status, 'pending'),
          ),
        )
        .limit(1)
        .execute();

      if (!dispatch) {
        throw new NotFoundException(
          'No pending dispatch request found for this order',
        );
      }

      const origin = (order as any).originInventoryLocationId;
      if (!origin) {
        throw new BadRequestException(
          'Order missing originInventoryLocationId',
        );
      }

      // payment_first — reserve any remaining shortfall before fulfilling
      if ((order as any).fulfillmentModel === 'payment_first') {
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

        for (const it of items) {
          if (!it.variantId) continue;
          const qty = Number(it.quantity ?? 0);
          if (qty <= 0) continue;

          await this.stock.reserveForOrderInTx(
            tx,
            companyId,
            orderId,
            origin,
            it.variantId,
            qty,
            `Reserved stock for dispatch of order ${(order as any).orderNumber ?? orderId}`,
          );
        }
      }

      // stock_first — reservations already exist, just fulfill them
      await this.stock.fulfillOrderReservationsInTx(tx, companyId, orderId);

      await tx
        .update(orderDispatches)
        .set({
          status: 'dispatched',
          confirmedByUserId: actor.id,
          note: note ?? dispatch.note,
          dispatchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orderDispatches.companyId, companyId),
            eq(orderDispatches.id, dispatch.id),
          ),
        )
        .execute();

      const [updated] = await tx
        .update(orders)
        .set({ status: 'fulfilled', updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'dispatched',
        fromStatus: 'awaiting_dispatch',
        toStatus: 'fulfilled',
        actorUserId: actor.id,
        ipAddress: actor.ip ?? null,
        message: 'Order dispatched and fulfilled by warehouse manager',
      });

      return { order: updated, dispatch };
    });

    await this.cache.bumpCompanyVersion(companyId);

    // ✅ notify owners + managers — outside transaction so email
    // failure never rolls back the dispatch
    try {
      const [actorName, recipientEmails, store, itemCountRow] =
        await Promise.all([
          this.getActorName(actor.id),
          this.getUserEmailsByRoles(companyId, ['owner', 'manager']),
          this.db.query.stores.findFirst({
            columns: { name: true },
            where: (f, { and, eq }) =>
              and(eq(f.companyId, companyId), eq(f.id, storeId)),
          }),
          this.db
            .select({ count: sql<number>`count(*)` })
            .from(orderItems)
            .where(
              and(
                eq(orderItems.companyId, companyId),
                eq(orderItems.orderId, orderId),
              ),
            )
            .execute()
            .then((r) => Number(r[0]?.count ?? 0)),
        ]);

      const order = result.order;
      const dispatch = result.dispatch;
      const shippingAddress = (order as any)?.shippingAddress as any;
      const customerName = shippingAddress
        ? [shippingAddress?.firstName, shippingAddress?.lastName]
            .filter(Boolean)
            .join(' ') || null
        : null;

      await Promise.all(
        recipientEmails.map((toEmail) =>
          this.dispatchNotification.sendConfirmDispatchEmail({
            toEmail,
            orderNumber: (order as any).orderNumber ?? orderId,
            orderId,
            customerName,
            itemCount: itemCountRow,
            total: (order as any).total ?? null,
            currency: (order as any).currency ?? null,
            confirmedBy: actorName,
            dispatchedAt: dispatch.dispatchedAt?.toISOString() ?? null,
            storeName: store?.name ?? undefined,
            shippingAddress: shippingAddress
              ? {
                  city: shippingAddress?.city ?? null,
                  state: shippingAddress?.state ?? null,
                  country: shippingAddress?.country ?? null,
                }
              : null,
          }),
        ),
      );
    } catch (err) {
      console.error('Failed to send confirm dispatch emails:', err);
    }

    return result;
  }

  // ─────────────────────────────────────────────
  // Cancel a pending dispatch request
  // (e.g. admin made a mistake, needs to revise order)
  // ─────────────────────────────────────────────
  async cancelDispatch(
    companyId: string,
    orderId: string,
    actor: Actor,
    note?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) throw new NotFoundException('Order not found');

      if (order.status !== 'awaiting_dispatch') {
        throw new BadRequestException('Order is not awaiting dispatch');
      }

      const [dispatch] = await tx
        .select()
        .from(orderDispatches)
        .where(
          and(
            eq(orderDispatches.companyId, companyId),
            eq(orderDispatches.orderId, orderId),
            eq(orderDispatches.status, 'pending'),
          ),
        )
        .limit(1)
        .execute();

      if (!dispatch) {
        throw new NotFoundException('No pending dispatch request found');
      }

      await tx
        .update(orderDispatches)
        .set({
          status: 'cancelled',
          note: note ?? dispatch.note,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orderDispatches.companyId, companyId),
            eq(orderDispatches.id, dispatch.id),
          ),
        )
        .execute();

      // Revert order back to paid so it can be re-dispatched
      const previousStatus =
        (order as any).fulfillmentModel === 'lay_buy' ? 'lay_buy' : 'paid';

      await tx
        .update(orders)
        .set({ status: previousStatus, updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'dispatch_cancelled',
        fromStatus: 'awaiting_dispatch',
        toStatus: previousStatus,
        actorUserId: actor.id,
        ipAddress: actor.ip ?? null,
        message: 'Dispatch request cancelled',
      });

      return dispatch;
    });
  }

  // ─────────────────────────────────────────────
  // List dispatch records (inventory manager view)
  // ─────────────────────────────────────────────
  async listDispatches(
    companyId: string,
    storeId: string,
    status?: 'pending' | 'dispatched' | 'cancelled',
  ) {
    const rows = await this.db
      .select({
        dispatch: orderDispatches,
        orderNumber: orders.orderNumber,
        orderStatus: orders.status,
        customerId: orders.customerId,
        shippingAddress: orders.shippingAddress,
        total: orders.total,
        currency: orders.currency,
        itemCount: sql<number>`
        (SELECT COUNT(*) FROM order_items oi
         WHERE oi.order_id = ${orderDispatches.orderId}
         AND oi.company_id = ${companyId})
      `.as('item_count'),
      })
      .from(orderDispatches)
      .leftJoin(
        orders,
        and(
          eq(orders.companyId, companyId),
          eq(orders.id, orderDispatches.orderId),
        ),
      )
      .where(
        and(
          eq(orderDispatches.companyId, companyId),
          eq(orderDispatches.storeId, storeId),
          status ? eq(orderDispatches.status, status) : undefined,
        ),
      )
      .orderBy(desc(orderDispatches.createdAt))
      .execute();

    return rows.map((r) => ({
      ...r.dispatch,
      orderNumber: r.orderNumber ?? null,
      orderStatus: r.orderStatus ?? null,
      currency: r.currency ?? null,
      total: r.total ?? null,
      itemCount: Number(r.itemCount ?? 0),
      // pull customer name from shipping address snapshot
      customerName: r.shippingAddress
        ? [
            (r.shippingAddress as any)?.firstName,
            (r.shippingAddress as any)?.lastName,
          ]
            .filter(Boolean)
            .join(' ') || null
        : null,
      shippingAddress: r.shippingAddress ?? null,
    }));
  }

  async getDispatch(companyId: string, orderId: string) {
    const [dispatch] = await this.db
      .select()
      .from(orderDispatches)
      .where(
        and(
          eq(orderDispatches.companyId, companyId),
          eq(orderDispatches.orderId, orderId),
        ),
      )
      .orderBy(desc(orderDispatches.createdAt))
      .limit(1)
      .execute();

    if (!dispatch) throw new NotFoundException('Dispatch record not found');

    const items = await this.db
      .select({
        id: orderItems.id,
        name: orderItems.name,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
        lineTotal: orderItems.lineTotal,
        variantId: orderItems.variantId,
        productId: orderItems.productId,
      })
      .from(orderItems)
      .where(
        and(
          eq(orderItems.companyId, companyId),
          eq(orderItems.orderId, orderId),
        ),
      )
      .execute();

    return {
      ...dispatch,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        sku: it.sku ?? null,
        quantity: Number(it.quantity ?? 0),
        unitPrice: it.unitPrice ?? null,
        lineTotal: it.lineTotal ?? null,
        variantId: it.variantId ?? null,
        productId: it.productId ?? null,
      })),
    };
  }

  private async getUserEmailsByRoles(
    companyId: string,
    roleNames: string[],
  ): Promise<string[]> {
    const rows = await this.db
      .select({
        email: users.email,
      })
      .from(users)
      .innerJoin(
        companyRoles,
        and(
          eq(companyRoles.companyId, companyId),
          eq(companyRoles.id, users.companyRoleId),
          inArray(companyRoles.name, roleNames), // ← name not slug
        ),
      )
      .where(eq(users.companyId, companyId))
      .execute();

    return rows.map((r) => r.email).filter(Boolean) as string[];
  }

  private async getActorName(actorId: string): Promise<string | null> {
    const [user] = await this.db
      .select({
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1)
      .execute();

    if (!user) return null;
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
  }
}
