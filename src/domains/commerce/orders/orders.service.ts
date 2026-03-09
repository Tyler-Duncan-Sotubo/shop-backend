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
} from 'src/infrastructure/drizzle/schema';
import { ListOrdersDto } from './dto/list-orders.dto';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';
import { ZohoBooksService } from 'src/domains/integration/zoho/zoho-books.service';
import { ShippingZonesService } from 'src/domains/fulfillment/shipping/services/shipping-zones.service';
import { ShippingRatesService } from 'src/domains/fulfillment/shipping/services/shipping-rates.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
    private readonly stock: InventoryStockService,
    private readonly zohoBooks: ZohoBooksService,
    private readonly shippingZonesService: ShippingZonesService,
    private readonly shippingRatesService: ShippingRatesService,
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

      let shippingAddress = payload.shippingAddressId
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
        ? {
            zone: shippingQuote.zone
              ? {
                  id: shippingQuote.zone.id,
                  name: shippingQuote.zone.name,
                  priority: shippingQuote.zone.priority ?? null,
                }
              : null,
            rate: shippingQuote.rate
              ? {
                  id: shippingQuote.rate.id,
                  name: shippingQuote.rate.name,
                  calc: shippingQuote.rate.calc ?? null,
                  isDefault: shippingQuote.rate.isDefault ?? false,
                  type: shippingQuote.rate.type ?? null,
                }
              : null,
            amount: shippingQuote.amount ?? 0,
            totalWeightGrams,
          }
        : null;

      const [updated] = await tx
        .update(orders)
        .set({
          customerId,
          shippingZoneId: shippingQuote.zone?.id ?? null,
          selectedShippingRateId: shippingQuote.rate?.id ?? null,
          shippingAddress: shippingSnapshot as any,
          billingAddress: billingSnapshot as any,
          shippingMethodLabel: shippingQuote.rate?.name ?? null,
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

  private async getShippingQuoteForOrder(
    companyId: string,
    args: {
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
    const normalizeCountryCode = (value?: string | null) => {
      const v = (value ?? '').trim().toUpperCase();

      if (v === 'UNITED KINGDOM' || v === 'UK' || v === 'GB') return 'GB';
      if (v === 'NIGERIA' || v === 'NG') return 'NG';
      if (v === 'UNITED STATES' || v === 'USA' || v === 'US') return 'US';

      return v;
    };

    const zone = await this.shippingZonesService.resolveZone(
      companyId,
      args.storeId,
      normalizeCountryCode(args.shippingAddress.country ?? 'NG'),
      args.shippingAddress.state ?? undefined,
      args.shippingAddress.city ?? undefined,
    );

    if (!zone) {
      return {
        zone: null,
        rate: null,
        amount: 0,
      };
    }

    const allRates = await this.shippingRatesService.listRates(companyId, {
      zoneId: zone.id,
      storeId: args.storeId,
    });

    const activeRates = allRates.filter((r: any) => r.isActive);

    let selectedRate = args.shippingRateId
      ? activeRates.find((r: any) => r.id === args.shippingRateId)
      : (activeRates.find((r: any) => r.isDefault) ?? activeRates[0]);

    if (!selectedRate) {
      return {
        zone,
        rate: null,
        amount: 0,
      };
    }

    const amount = await this.shippingRatesService.computeRateAmount(
      companyId,
      selectedRate.id,
      selectedRate.calc,
      args.totalWeightGrams,
    );

    return {
      zone,
      rate: selectedRate,
      amount: Number(amount ?? 0),
    };
  }
}
