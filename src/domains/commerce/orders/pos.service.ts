// src/domains/pos/pos.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import {
  customers,
  orderCustomItems,
  orderEvents,
  orders,
  taxes,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { InvoiceService } from 'src/domains/billing/invoice/invoice.service';
import { NotificationsService } from 'src/domains/notification/services/notifications.service';
import { User } from 'src/channels/admin/common/types/user.type';
import { ManualOrdersService } from './manual-orders.service';
import { PaymentService } from 'src/domains/billing/payment/services/payment.service';
import { sql } from 'drizzle-orm/sql/sql';
import { InventoryStockService } from '../inventory/services/inventory-stock.service';

export type POSCheckoutDto = {
  storeId: string;
  currency?: string;
  originInventoryLocationId: string;

  applyVat: boolean;

  items: {
    variantId: string;
    quantity: number;
    unitPrice?: number | null;
  }[];

  customItems: {
    name: string;
    quantity: number;
    unitPrice: number;
    note?: string | null;
  }[];

  discounts: {
    label: string;
    amount: number; // major
  }[];

  paymentMethod: 'cash' | 'pos_machine' | 'bank_transfer';

  customer?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  note?: string | null;
};

@Injectable()
export class POSService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly cache: CacheService,
    private readonly manualOrders: ManualOrdersService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly notifications: NotificationsService,
    private readonly stock: InventoryStockService, // ← add
  ) {}

  async checkout(companyId: string, dto: POSCheckoutDto, actor: User) {
    const currency = dto.currency ?? 'NGN';

    // ── 1. Create order ────────────────────────────────────────────────────────
    const order = await this.manualOrders.createManualOrder(
      companyId,
      {
        storeId: dto.storeId,
        currency,
        channel: 'pos',
        fulfillmentModel: 'payment_first',
        originInventoryLocationId: dto.originInventoryLocationId,
        skipDraft: false,
      },
      actor,
    );

    const orderId = order.id;

    // ── 2. Add variant items ───────────────────────────────────────────────────
    for (const item of dto.items) {
      await this.manualOrders.addItem(
        companyId,
        {
          orderId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice ?? undefined,
        },
        false,
        actor,
      );
    }

    // ── 3. Add custom items ────────────────────────────────────────────────────
    if (dto.customItems.length > 0) {
      await this.addCustomItems(
        companyId,
        orderId,
        dto.storeId,
        dto.customItems,
        currency,
      );
    }

    // ── 4. Apply discounts ─────────────────────────────────────────────────────
    if (dto.discounts.length > 0) {
      const totalDiscount = dto.discounts.reduce((sum, d) => sum + d.amount, 0);
      const discountNote = dto.discounts.map((d) => d.label).join(', ');

      await this.manualOrders.applyDiscount(
        companyId,
        orderId,
        { type: 'flat', value: totalDiscount },
        actor,
      );

      if (!dto.note && discountNote) {
        await this.db
          .update(orders)
          .set({ note: discountNote, updatedAt: new Date() } as any)
          .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
          .execute();
      }
    }

    // ── 5. Submit for payment (draft → pending_payment) ────────────────────────
    await this.manualOrders.submitForPayment(
      companyId,
      orderId,
      actor,
      undefined,
      { skipInvoice: true },
    );

    // ── 6. Sync invoice with items ─────────────────────────────────────────────
    const invoice = await this.manualOrders.syncInvoiceAfterItems(
      companyId,
      orderId,
    );

    if (!invoice) {
      throw new BadRequestException('Failed to create invoice for POS order');
    }

    // ── 7. Apply VAT if enabled ────────────────────────────────────────────────
    if (dto.applyVat) {
      await this.applyStoreTax(companyId, dto.storeId, invoice.id);
    }

    // ── 8. Issue invoice ───────────────────────────────────────────────────────
    const issuedInvoice = await this.invoiceService.issueInvoice(
      invoice.id,
      { storeId: dto.storeId },
      companyId,
      actor.id,
      undefined,
      { autoSyncZoho: false },
    );

    // ── 9. Record payment ──────────────────────────────────────────────────────
    const totalMinor = Number(issuedInvoice.totalMinor ?? 0);
    const totalMajor = totalMinor / 100;

    const { paymentId, receiptId, receipt } =
      await this.paymentService.recordInvoicePayment(
        {
          invoiceId: issuedInvoice.id,
          amount: totalMajor,
          currency,
          method:
            dto.paymentMethod === 'pos_machine' ? 'pos' : dto.paymentMethod,
          reference: null,
          meta: {
            channel: 'pos',
            paymentMethod: dto.paymentMethod,
          },
        },
        companyId,
        actor.id,
      );

    // ── 10. Reserve + fulfill inventory + mark fulfilled ───────────────────────
    await this.db.transaction(async (tx) => {
      const origin = dto.originInventoryLocationId;

      // Reserve stock for each variant item
      for (const item of dto.items) {
        await this.stock.reserveForOrderInTx(
          tx,
          companyId,
          orderId,
          origin,
          item.variantId,
          item.quantity,
          `POS sale — Order #${order.orderNumber}`,
        );
      }

      // Fulfill reservations — deducts from available immediately
      await this.stock.fulfillOrderReservationsInTx(tx, companyId, orderId);

      // Mark order fulfilled
      await tx
        .update(orders)
        .set({
          status: 'fulfilled',
          fulfilledAt: new Date(),
          updatedAt: new Date(),
        } as any)
        .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
        .execute();

      // Log fulfillment event
      await tx.insert(orderEvents).values({
        companyId,
        orderId,
        type: 'fulfilled',
        fromStatus: 'paid',
        toStatus: 'fulfilled',
        actorUserId: actor.id,
        message: 'Auto-fulfilled at POS — goods handed over at counter',
      } as any);
    });

    // ── 11. Find or create customer (non-blocking) ─────────────────────────────
    if (dto.customer?.name || dto.customer?.phone || dto.customer?.email) {
      this.findOrCreateCustomer(
        companyId,
        dto.storeId,
        orderId,
        dto.customer,
      ).catch(console.error);
    }

    // ── 12. Notification (non-blocking) ───────────────────────────────────────
    this.notifications
      .create({
        companyId,
        type: 'payment_received',
        title: 'POS Sale complete',
        body: `${currency} ${totalMajor.toLocaleString()} via ${dto.paymentMethod} — Order #${order.orderNumber}`,
        data: {
          orderId,
          orderNumber: order.orderNumber,
          paymentId,
          receiptId,
          fulfilled: true,
        },
        channel: 'in_app',
      })
      .catch(console.error);

    await this.cache.bumpCompanyVersion(companyId);

    return {
      orderId,
      orderNumber: order.orderNumber,
      invoiceId: issuedInvoice.id,
      paymentId,
      receiptId,
      receiptNumber: receipt?.receiptNumber ?? null,
      totalMinor,
      totalMajor,
      currency,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async addCustomItems(
    companyId: string,
    orderId: string,
    storeId: string,
    items: POSCheckoutDto['customItems'],
    currency: string,
  ) {
    for (const item of items) {
      const unitPriceMinor = Math.round(item.unitPrice * 100);
      const lineTotalMinor = unitPriceMinor * item.quantity;

      await this.db
        .insert(orderCustomItems)
        .values({
          companyId,
          storeId,
          orderId,
          name: item.name.trim(),
          note: item.note ?? null,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          unitPriceMinor,
          lineTotal: String(item.unitPrice * item.quantity),
          lineTotalMinor,
          currency,
        } as any)
        .execute();
    }

    // Bump order total to include custom items
    await this.recalculateWithCustomItems(companyId, orderId);
  }

  private async recalculateWithCustomItems(companyId: string, orderId: string) {
    const result = await this.db.execute(
      sql`
      SELECT COALESCE(SUM(line_total_minor), 0) as custom_total_minor
      FROM order_custom_items
      WHERE company_id = ${companyId} AND order_id = ${orderId}
    `,
    );

    const rows = (result as any)?.rows ?? result;
    const row = Array.isArray(rows) ? rows[0] : rows;
    const customTotalMinor = Number(row?.custom_total_minor ?? 0);

    if (customTotalMinor === 0) return;

    const customTotal = customTotalMinor / 100;

    await this.db.execute(
      sql`
      UPDATE orders
      SET
        subtotal = COALESCE(subtotal::numeric, 0) + ${customTotal},
        total = GREATEST(
          COALESCE(subtotal::numeric, 0) + ${customTotal} - COALESCE(discount_total::numeric, 0),
          0
        ),
        updated_at = NOW()
      WHERE company_id = ${companyId} AND id = ${orderId}
    `,
    );
  }

  private async applyStoreTax(
    companyId: string,
    storeId: string,
    invoiceId: string,
  ) {
    // Get active default tax for this store
    const [tax] = await this.db
      .select()
      .from(taxes)
      .where(
        and(
          eq(taxes.companyId, companyId),
          eq(taxes.storeId, storeId),
          eq(taxes.isActive, true),
          eq(taxes.isDefault, true),
        ),
      )
      .limit(1)
      .execute();

    if (!tax) return; // no tax configured — skip

    // Apply tax to all non-shipping invoice lines
    await this.db.execute(
      sql`
        UPDATE invoice_lines
        SET
          tax_id = ${tax.id},
          tax_name = ${tax.name},
          tax_rate_bps = ${tax.rateBps},
          tax_inclusive = false
        WHERE invoice_id = ${invoiceId}
          AND (meta->>'kind' IS NULL OR meta->>'kind' != 'shipping')
      ` as any,
    );

    // Recalculate draft totals with tax applied
    await this.invoiceService.recalculateDraftTotals(companyId, invoiceId);
  }

  private async findOrCreateCustomer(
    companyId: string,
    storeId: string,
    orderId: string,
    input: {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    },
  ) {
    const phone = input.phone?.trim() || null;
    const email = input.email?.trim().toLowerCase() || null;
    const name = input.name?.trim() || null;

    // Try to find existing customer by phone or email
    if (phone || email) {
      const [existing] = await this.db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.companyId, companyId),
            phone
              ? eq(customers.phone, phone)
              : email
                ? eq(customers.billingEmail, email)
                : undefined,
          ),
        )
        .limit(1)
        .execute();

      if (existing) {
        // Link existing customer to order
        await this.db
          .update(orders)
          .set({ customerId: existing.id, updatedAt: new Date() } as any)
          .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
          .execute();
        return existing;
      }
    }

    // Create new customer
    const displayName = name ?? phone ?? email ?? 'Walk-in Customer';

    const [created] = await this.db
      .insert(customers)
      .values({
        companyId,
        storeId,
        displayName,
        type: 'individual',
        firstName: name?.split(' ')[0] ?? null,
        lastName: name?.split(' ').slice(1).join(' ') || null,
        billingEmail: email ?? null,
        phone: phone ?? null,
        marketingOptIn: false,
        isActive: true,
      } as any)
      .returning({ id: customers.id })
      .execute();

    // Link to order
    await this.db
      .update(orders)
      .set({ customerId: created.id, updatedAt: new Date() } as any)
      .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
      .execute();

    return created;
  }
}
