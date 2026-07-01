import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { User } from 'src/channels/admin/common/types/user.type';
import {
  orderItems,
  orders,
  productImages,
  productVariants,
  orderEvents,
  invoices,
  payments,
  paymentFiles,
  customers,
  customerAddresses,
  orderDispatches,
  companySubscriptions,
  subscriptionPlans,
} from 'src/infrastructure/drizzle/schema';
import { ListOrdersDto } from './dto/list-orders.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ZohoBooksService } from 'src/domains/integration/zoho/zoho-books.service';
import { NotificationsService } from 'src/domains/notification/services/notifications.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly stock: InventoryStockService,
    private readonly zohoBooks: ZohoBooksService,
    private readonly notifications: NotificationsService,
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
          eq(orders.storeId, storeId),
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

    // ✅ Payment (storefront-safe)
    const payRows = await this.db
      .select({
        id: payments.id,
        method: payments.method,
        status: payments.status,
        provider: payments.provider,
        amountMinor: payments.amountMinor,
        currency: payments.currency,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .where(
        and(eq(payments.companyId, companyId), eq(payments.orderId, orderId)),
      )
      .orderBy(desc(payments.createdAt))
      .limit(1)
      .execute();

    const payment = payRows?.[0] ?? null;

    let evidenceCount = 0;
    let lastEvidenceUrl: string | null = null;

    if (payment?.id) {
      const evidenceRows = await this.db
        .select({
          id: paymentFiles.id,
          url: paymentFiles.url,
          createdAt: paymentFiles.createdAt,
        })
        .from(paymentFiles)
        .where(
          and(
            eq(paymentFiles.companyId, companyId),
            eq(paymentFiles.paymentId, payment.id),
          ),
        )
        .orderBy(desc(paymentFiles.createdAt))
        .execute();

      evidenceCount = evidenceRows.length;
      lastEvidenceUrl = evidenceRows?.[0]?.url ?? null;
    }

    return {
      ...order,
      items,
      events,
      payment: payment ? { ...payment, evidenceCount, lastEvidenceUrl } : null,
    };
  }

  // -----------------------
  // GET /orders
  // -----------------------
  async listOrders(companyId: string, q: ListOrdersDto) {
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const offset = Number(q.offset ?? 0);

    const where = and(
      eq(orders.companyId, companyId),
      eq(orders.storeId, q.storeId),
      q.status ? eq(orders.status, q.status as any) : undefined,
      q.channel ? eq(orders.channel, q.channel as any) : undefined,
      q.search
        ? or(
            ilike(orders.orderNumber, `%${q.search}%`),
            ilike(sql`${orders.id}::text`, `%${q.search}%`),
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

    // ── Enrich with item count + first item name ──
    const orderIds = rows.map((o) => o.id);

    const itemSummaryMap = new Map<
      string,
      {
        itemCount: number;
        firstItemName: string | null;
        firstItemImageUrl: string | null;
      }
    >();

    if (orderIds.length > 0) {
      const itemRows = await this.db
        .select({
          orderId: orderItems.orderId,
          name: orderItems.name,
          variantId: orderItems.variantId,
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
            sql`${orderItems.orderId} = ANY(${sql.raw(
              `ARRAY[${orderIds.map((id) => `'${id}'`).join(',')}]::uuid[]`,
            )})`,
          ),
        )
        .orderBy(orderItems.orderId, orderItems.createdAt)
        .execute();

      for (const row of itemRows) {
        const existing = itemSummaryMap.get(row.orderId);
        if (!existing) {
          itemSummaryMap.set(row.orderId, {
            itemCount: 1,
            firstItemName: row.name ?? null,
            firstItemImageUrl: row.imageUrl ?? null, // ← add
          });
        } else {
          existing.itemCount += 1;
        }
      }
    }
    const enrichedRows = rows.map((order) => {
      const summary = itemSummaryMap.get(order.id);
      return {
        ...order,
        itemCount: summary?.itemCount ?? 0,
        firstItemName: summary?.firstItemName ?? null,
        firstItemImageUrl: summary?.firstItemImageUrl ?? null, // ← add
      };
    });

    return { rows: enrichedRows, count: Number(count ?? 0), limit, offset };
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

    // ✅ notification
    this.notifications
      .create({
        companyId,
        type: 'payment_received',
        title: 'Order marked as paid',
        body: `Order #${(result as any).orderNumber ?? orderId} has been marked as paid`,
        data: {
          orderId,
          orderNumber: (result as any).orderNumber ?? null,
        },
        channel: 'in_app',
      })
      .catch(console.error);

    return result;
  }

  // ─────────────────────────────────────────────
  // Direct fulfillment (Free / Starter / Growth / Pro plans only)
  // Custom plan must use the two-step dispatch workflow.
  // ─────────────────────────────────────────────
  async fulfillOrder(companyId: string, orderId: string, user?: User, ip?: string) {
    // Plan guard — Custom plan must go through dispatch
    const [sub] = await this.db
      .select({ planName: subscriptionPlans.name })
      .from(companySubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(companySubscriptions.planId, subscriptionPlans.id),
      )
      .where(eq(companySubscriptions.companyId, companyId))
      .limit(1)
      .execute();

    if (sub?.planName === 'Custom') {
      throw new BadRequestException(
        'Custom plan accounts use the dispatch workflow. Ask your warehouse team to confirm the dispatch.',
      );
    }

    const result = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) throw new NotFoundException('Order not found');

      if (order.status !== 'paid' && order.status !== 'lay_buy') {
        throw new BadRequestException(
          'Only paid or lay-buy orders can be fulfilled',
        );
      }

      const origin = (order as any).originInventoryLocationId as string | null;
      if (!origin) {
        throw new BadRequestException(
          'Order is missing an inventory location — cannot deduct stock',
        );
      }

      // Reserve stock for every variant line item, then immediately fulfill.
      // reserveForOrderInTx is idempotent, so this works for both
      // payment_first and stock_first fulfillment models.
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
          `Reserved for direct fulfillment of order ${(order as any).orderNumber ?? orderId}`,
        );
      }

      await this.stock.fulfillOrderReservationsInTx(tx, companyId, orderId);

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
        fromStatus: order.status,
        toStatus: 'fulfilled',
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order fulfilled directly — stock deducted',
      });

      return updated;
    });

    await this.cache.bumpCompanyVersion(companyId);

    this.notifications
      .create({
        companyId,
        type: 'order_fulfilled',
        title: 'Order fulfilled',
        body: `Order #${(result as any).orderNumber ?? orderId} has been fulfilled`,
        data: { orderId, orderNumber: (result as any).orderNumber ?? null },
        channel: 'in_app',
      })
      .catch(console.error);

    return result;
  }

  async cancel(
    companyId: string,
    orderId: string,
    user?: User,
    ip?: string,
    opts?: { forceRefund?: boolean; refundNote?: string },
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!before) throw new NotFoundException('Order not found');

      const cancellableStatuses = [
        'pending_payment',
        'lay_buy',
        'paid',
        'awaiting_dispatch',
      ];
      if (!cancellableStatuses.includes(before.status)) {
        throw new BadRequestException(
          `Cannot cancel order with status: ${before.status}`,
        );
      }

      const [inv] = await tx
        .select({ id: invoices.id, paidMinor: invoices.paidMinor })
        .from(invoices)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.orderId, orderId)),
        )
        .execute();

      const paidMinor = Number(inv?.paidMinor ?? 0);

      if (paidMinor > 0 && !opts?.forceRefund) {
        throw new BadRequestException(
          `This order has already been paid. To cancel it, please confirm you want to process a refund.`,
        );
      }

      // Cancel pending dispatch if awaiting_dispatch
      if (before.status === 'awaiting_dispatch') {
        const [pendingDispatch] = await tx
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

        if (pendingDispatch) {
          await tx
            .update(orderDispatches)
            .set({
              status: 'cancelled',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(orderDispatches.companyId, companyId),
                eq(orderDispatches.id, pendingDispatch.id),
              ),
            )
            .execute();
        }
      }

      const newStatus =
        paidMinor > 0 && opts?.forceRefund ? 'refunded' : 'cancelled';

      // Void any draft or issued invoices for this order
      const orderInvoices = await tx
        .select({ id: invoices.id, status: invoices.status })
        .from(invoices)
        .where(
          and(eq(invoices.companyId, companyId), eq(invoices.orderId, orderId)),
        )
        .execute();

      for (const inv of orderInvoices) {
        if (inv.status !== 'void') {
          await tx
            .update(invoices)
            .set({
              status: 'void' as any,
              voidedAt: new Date(),
              voidReason:
                newStatus === 'refunded'
                  ? 'Order cancelled and flagged for refund'
                  : 'Order cancelled',
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id))
            .execute();
        }
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

      if (origin && (before as any).fulfillmentModel === 'stock_first') {
        for (const it of items) {
          if (!it.variantId) continue;
          const qty = Number(it.quantity ?? 0);
          if (qty <= 0) continue;
          await this.stock.releaseReservationInTx(
            tx,
            companyId,
            orderId,
            origin,
            it.variantId,
            qty,
          );
        }
      }

      const [after] = await tx
        .update(orders)
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: newStatus === 'refunded' ? 'refunded' : 'cancelled',
        fromStatus: before.status,
        toStatus: after.status,
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message:
          newStatus === 'refunded'
            ? `Order cancelled and flagged for refund${opts?.refundNote ? `: ${opts.refundNote}` : ''}`
            : 'Order cancelled',
      });

      return after;
    });

    await this.cache.bumpCompanyVersion(companyId);

    // ✅ notification
    this.notifications
      .create({
        companyId,
        type: 'order_cancelled',
        title:
          result.status === 'refunded'
            ? 'Order cancelled & refunded'
            : 'Order cancelled',
        body: `Order #${(result as any).orderNumber ?? orderId} has been ${result.status === 'refunded' ? 'cancelled and flagged for refund' : 'cancelled'}`,
        data: {
          orderId,
          orderNumber: (result as any).orderNumber ?? null,
          status: result.status,
        },
        channel: 'in_app',
      })
      .catch(console.error);

    return result;
  }

  // In orders.service.ts — add this method

  async convertToLayBuy(
    companyId: string,
    orderId: string,
    user?: User,
    ip?: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!before) throw new NotFoundException('Order not found');
      if (before.status !== 'pending_payment' && before.status !== 'draft') {
        throw new BadRequestException(
          'Only pending_payment or draft orders can be converted to lay-buy',
        );
      }

      const [after] = await tx
        .update(orders)
        .set({ status: 'lay_buy', updatedAt: new Date() })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'converted_to_lay_buy',
        fromStatus: before.status,
        toStatus: after.status,
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order converted to lay-buy — fulfillment before payment',
      });

      return after;
    });

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  async updateCustomerAndShipping(
    companyId: string,
    orderId: string,
    payload: {
      customerId?: string;
      createCustomer?: {
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
      shippingAddressId?: string;
      billingAddressId?: string | null;
      shippingRateId?: string | null;
    },
    user?: User,
    ip?: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.status === 'fulfilled' || order.status === 'cancelled') {
        throw new BadRequestException(
          'Customer/shipping cannot be changed for this order status',
        );
      }

      let customerId = payload.customerId ?? null;

      if (!customerId && payload.createCustomer) {
        const email = payload.createCustomer.email.trim().toLowerCase();

        const existingCustomer = await tx.query.customers.findFirst({
          where: and(
            eq(customers.companyId, companyId),
            eq(customers.billingEmail, email),
          ),
        });

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const displayName = [
            payload.createCustomer.firstName,
            payload.createCustomer.lastName,
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

          const [createdCustomer] = await tx
            .insert(customers)
            .values({
              companyId,
              storeId: order.storeId,
              billingEmail: email,
              firstName: payload.createCustomer.firstName ?? null,
              lastName: payload.createCustomer.lastName ?? null,
              displayName: displayName || email,
              phone: payload.createCustomer.phone ?? null,
              isActive: true,
            })
            .returning()
            .execute();

          customerId = createdCustomer.id;
        }
      }

      if (!customerId) {
        throw new BadRequestException(
          'customerId or createCustomer is required',
        );
      }

      const customer = await tx.query.customers.findFirst({
        where: and(
          eq(customers.companyId, companyId),
          eq(customers.id, customerId),
        ),
      });

      if (!customer) {
        throw new BadRequestException('Customer not found');
      }

      if (customer.storeId && customer.storeId !== order.storeId) {
        throw new BadRequestException('Customer does not belong to this store');
      }

      const customerAddressRows = await tx
        .select()
        .from(customerAddresses)
        .where(
          and(
            eq(customerAddresses.companyId, companyId),
            eq(customerAddresses.customerId, customerId),
          ),
        )
        .execute();

      if (!customerAddressRows.length) {
        throw new BadRequestException('Customer has no saved addresses');
      }

      const shippingAddress = payload.shippingAddressId
        ? (customerAddressRows.find(
            (a) => a.id === payload.shippingAddressId,
          ) ?? null)
        : (customerAddressRows.find((a) => a.isDefaultShipping) ??
          customerAddressRows[0] ??
          null);

      if (!shippingAddress) {
        throw new BadRequestException(
          'Shipping address not found for customer',
        );
      }

      let billingAddress = payload.billingAddressId
        ? (customerAddressRows.find((a) => a.id === payload.billingAddressId) ??
          null)
        : (customerAddressRows.find((a) => a.isDefaultBilling) ??
          shippingAddress);

      if (!billingAddress) {
        billingAddress = shippingAddress;
      }

      const orderItemsRows = await tx
        .select({
          quantity: orderItems.quantity,
          weight: productVariants.weight,
        })
        .from(orderItems)
        .leftJoin(
          productVariants,
          and(
            eq(productVariants.companyId, orderItems.companyId),
            eq(productVariants.id, orderItems.variantId),
          ),
        )
        .where(
          and(
            eq(orderItems.companyId, companyId),
            eq(orderItems.orderId, orderId),
          ),
        )
        .execute();

      const totalWeightGrams = orderItemsRows.reduce((sum, row) => {
        const qty = Number(row.quantity ?? 0);
        const weight = Number(row.weight ?? 0);
        return sum + qty * weight;
      }, 0);

      const shippingQuote = await this.getShippingQuoteForOrder(companyId, {
        storeId: order.storeId,
        shippingAddress,
        totalWeightGrams,
        shippingRateId: payload.shippingRateId ?? null,
      });

      const subtotal = Number(order.subtotal ?? 0);
      const taxTotal = Number(order.taxTotal ?? 0);
      const discountTotal = Number(order.discountTotal ?? 0);
      const shippingTotal = Number(shippingQuote.amount ?? 0);
      const total = subtotal + taxTotal + shippingTotal - discountTotal;

      const subtotalMinor = Number(order.subtotalMinor ?? 0);
      const taxTotalMinor = Number(order.taxTotalMinor ?? 0);
      const discountTotalMinor = Number(order.discountTotalMinor ?? 0);
      const shippingTotalMinor = Math.round(shippingTotal * 100);
      const totalMinor =
        subtotalMinor + taxTotalMinor + shippingTotalMinor - discountTotalMinor;

      const shippingSnapshot = {
        customerAddressId: shippingAddress.id,
        label: shippingAddress.label ?? null,
        firstName: shippingAddress.firstName ?? null,
        lastName: shippingAddress.lastName ?? null,
        email: customer.billingEmail ?? null,
        phone: shippingAddress.phone ?? customer.phone ?? null,
        address1: shippingAddress.line1 ?? null,
        address2: shippingAddress.line2 ?? null,
        city: shippingAddress.city ?? null,
        state: shippingAddress.state ?? null,
        postalCode: shippingAddress.postalCode ?? null,
        country: shippingAddress.country ?? null,
        isDefaultShipping: shippingAddress.isDefaultShipping ?? false,
      };

      const billingSnapshot = {
        customerAddressId: billingAddress.id,
        label: billingAddress.label ?? null,
        firstName: billingAddress.firstName ?? null,
        lastName: billingAddress.lastName ?? null,
        email: customer.billingEmail ?? null,
        phone: billingAddress.phone ?? customer.phone ?? null,
        address1: billingAddress.line1 ?? null,
        address2: billingAddress.line2 ?? null,
        city: billingAddress.city ?? null,
        state: billingAddress.state ?? null,
        postalCode: billingAddress.postalCode ?? null,
        country: billingAddress.country ?? null,
        isDefaultBilling: billingAddress.isDefaultBilling ?? false,
      };

      const shippingQuoteSnapshot = shippingQuote
        ? { zone: null, rate: null, amount: shippingQuote.amount ?? 0, totalWeightGrams }
        : null;

      const [updated] = await tx
        .update(orders)
        .set({
          customerId,
          shippingZoneId: null,
          selectedShippingRateId: null,
          shippingAddress: shippingSnapshot as any,
          billingAddress: billingSnapshot as any,
          shippingMethodLabel: null,
          deliveryMethodType: 'shipping',
          shippingQuote: shippingQuoteSnapshot as any,
          shippingTotal: String(shippingTotal) as any,
          total: String(total) as any,
          shippingTotalMinor,
          totalMinor,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .returning()
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'shipping_updated',
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: 'Order customer/shipping details updated',
      });

      return updated;
    });
  }

  async updateShippingFee(
    companyId: string,
    orderId: string,
    shippingAmount: number,
    user?: User,
    ip?: string,
  ) {
    const result = await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .for('update')
        .execute();

      if (!order) throw new NotFoundException('Order not found');

      if (['fulfilled', 'cancelled', 'refunded'].includes(order.status)) {
        throw new BadRequestException(
          `Cannot update shipping on a ${order.status} order`,
        );
      }

      if (shippingAmount < 0) {
        throw new BadRequestException('Shipping amount cannot be negative');
      }

      const subtotalNum = Number(order.subtotal ?? 0);
      const discountNum = Number(order.discountTotal ?? 0);
      const shippingTotalMinor = Math.round(shippingAmount * 100);
      const totalNum = subtotalNum + shippingAmount - discountNum;

      const subtotalMinor = Number((order as any).subtotalMinor ?? 0);
      const discountTotalMinor = Number((order as any).discountTotalMinor ?? 0);
      const totalMinor =
        subtotalMinor + shippingTotalMinor - discountTotalMinor;

      await tx
        .update(orders)
        .set({
          shippingTotal: String(shippingAmount) as any,
          shippingTotalMinor: shippingTotalMinor as any,
          total: Math.max(totalNum, 0).toFixed(2) as any,
          totalMinor: Math.max(totalMinor, 0) as any,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'shipping_updated',
        actorUserId: user?.id ?? null,
        ipAddress: ip ?? null,
        message: `Shipping fee updated to ${shippingAmount}`,
      });

      const [updated] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      return updated;
    });

    await this.cache.bumpCompanyVersion(companyId);
    return result;
  }

  private async getShippingQuoteForOrder(
    _companyId: string,
    _args: {
      storeId: string;
      shippingAddress: {
        country?: string | null;
        state?: string | null;
        city?: string | null;
      };
      totalWeightGrams: number;
      shippingRateId?: string | null;
    },
  ) {
    return { zone: null, rate: null, amount: 0 };
  }
}
