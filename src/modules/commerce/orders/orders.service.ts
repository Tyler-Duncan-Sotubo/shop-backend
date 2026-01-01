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
  orderItems,
  orders,
  productImages,
  productVariants,
  orderEvents,
  invoices,
} from 'src/drizzle/schema';
import { ListOrdersDto } from './dto/list-orders.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
    private readonly stock: InventoryStockService,
  ) {}

  // -----------------------
  // GET /orders/:id
  // -----------------------
  async getOrder(companyId: string, orderId: string) {
    const order = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
      .execute();

    if (!order?.[0]) throw new NotFoundException('Order not found');

    const rows = await this.db
      .select({
        item: orderItems,
        imageUrl: productImages.url,
      })
      .from(orderItems)
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, orderItems.variantId),
        ),
      )
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.id, productVariants.imageId),
        ),
      )
      .where(
        and(
          eq(orderItems.companyId, companyId),
          eq(orderItems.orderId, orderId),
        ),
      )
      .execute();

    const items = rows.map((r) => ({
      ...r.item,
      imageUrl: r.imageUrl ?? null,
    }));

    const events = await this.db
      .select()
      .from(orderEvents)
      .where(
        and(
          eq(orderEvents.companyId, companyId),
          eq(orderEvents.orderId, orderId),
        ),
      )
      .orderBy(desc(orderEvents.createdAt))
      .execute();

    return { ...order[0], items, events };
  }

  async getOrderStorefront(
    companyId: string,
    storeId: string,
    orderId: string,
  ) {
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.companyId, companyId),
          eq(orders.storeId, storeId), // ✅ store scope
          eq(orders.id, orderId),
        ),
      )
      .execute();

    const order = orderRows?.[0];
    if (!order) throw new NotFoundException('Order not found');

    const rows = await this.db
      .select({
        item: orderItems,
        imageUrl: productImages.url,
      })
      .from(orderItems)
      .leftJoin(
        productVariants,
        and(
          eq(productVariants.companyId, companyId),
          eq(productVariants.id, orderItems.variantId),
        ),
      )
      .leftJoin(
        productImages,
        and(
          eq(productImages.companyId, companyId),
          eq(productImages.id, productVariants.imageId),
        ),
      )
      .where(
        and(
          eq(orderItems.companyId, companyId),
          eq(orderItems.orderId, orderId),
        ),
      )
      .execute();

    const items = rows.map((r) => ({
      ...r.item,
      imageUrl: r.imageUrl ?? null,
    }));

    const events = await this.db
      .select()
      .from(orderEvents)
      .where(
        and(
          eq(orderEvents.companyId, companyId),
          eq(orderEvents.orderId, orderId),
        ),
      )
      .orderBy(desc(orderEvents.createdAt))
      .execute();

    return { ...order, items, events };
  }

  // -----------------------
  // GET /orders
  // -----------------------
  async listOrders(companyId: string, q: ListOrdersDto) {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Number(q.offset ?? 0);

    const where = and(
      eq(orders.companyId, companyId),

      // ✅ store scoped (not from query)
      eq(orders.storeId, q.storeId),

      q.status ? eq(orders.status, q.status as any) : undefined,
      q.channel ? eq(orders.channel, q.channel as any) : undefined,
      q.search
        ? or(
            ilike(orders.id, `%${q.search}%`),
            ilike(orders.orderNumber, `%${q.search}%`),
            ilike(sql`${orders.shippingAddress}::text`, `%${q.search}%`),
          )
        : undefined,
    );

    const rows = await this.db
      .select()
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset(offset)
      .execute();

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(where)
      .execute();

    return { rows, count: Number(count ?? 0), limit, offset };
  }

  // -----------------------
  // POST /orders/:id/pay
  // -----------------------
  async markPaid(companyId: string, orderId: string, user?: User, ip?: string) {
    const result = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!before) throw new NotFoundException('Order not found');
      if (before.status !== 'pending_payment') {
        throw new BadRequestException(
          'Only pending_payment orders can be marked paid',
        );
      }

      const [after] = await tx
        .update(orders)
        .set({ status: 'paid', updatedAt: new Date(), paidAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'marked_paid',
        fromStatus: before.status,
        toStatus: after.status,
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order marked as paid',
      });

      return after;
    });

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  // -----------------------
  // POST /orders/:id/cancel
  // -----------------------
  async cancel(companyId: string, orderId: string, user?: User, ip?: string) {
    const result = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!before) throw new NotFoundException('Order not found');

      if (before.status !== 'pending_payment') {
        throw new BadRequestException(
          'Only pending_payment orders can be cancelled',
        );
      }

      // ✅ 1) Find invoice for this order
      const [inv] = await tx
        .select({ id: invoices.id, paidMinor: invoices.paidMinor })
        .from(invoices)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.orderId, orderId)),
        )
        .execute();

      // If you always have an invoice, you can throw instead
      if (!inv) throw new BadRequestException('Order has no invoice');

      const paidMinor = Number(inv.paidMinor ?? 0);

      if (paidMinor > 0) {
        throw new BadRequestException(
          `Cannot cancel order with paid invoice amount: ${paidMinor}`,
        );
      }

      // ... your existing reservation release logic
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

      const origin = (before as any).originInventoryLocationId;
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

      const [after] = await tx
        .update(orders)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'cancelled',
        fromStatus: before.status,
        toStatus: after.status,
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order cancelled',
      });

      return after;
    });

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  // -----------------------
  // POST /orders/:id/fulfill
  // -----------------------
  async fulfill(companyId: string, orderId: string, user?: User, ip?: string) {
    const result = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!before) throw new NotFoundException('Order not found');
      if (before.status !== 'paid') {
        throw new BadRequestException('Only paid orders can be fulfilled');
      }

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

      const origin = (before as any).originInventoryLocationId;
      if (!origin) {
        throw new BadRequestException(
          'Order missing originInventoryLocationId',
        );
      }

      for (const it of items) {
        if (!it.variantId) continue;
        const qty = Number(it.quantity ?? 0);
        if (qty <= 0) continue;

        await this.stock.fulfillFromReservationInTx(
          tx,
          companyId,
          origin,
          it.variantId,
          qty,
        );
      }

      const [after] = await tx
        .update(orders)
        .set({ status: 'fulfilled', updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'fulfilled',
        fromStatus: before.status,
        toStatus: after.status,
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order fulfilled',
      });

      return after;
    });

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }
}
