// src/domains/commerce/orders/order-invoice.cron.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, lte } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  orders,
  invoices,
  orderEvents,
} from 'src/infrastructure/drizzle/schema';
import { CacheService } from 'src/infrastructure/cache/cache.service';

@Injectable()
export class OrderInvoiceCronService {
  private readonly logger = new Logger(OrderInvoiceCronService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly cache: CacheService,
  ) {}

  // ── Run every 6 hours ─────────────────────────────────────
  @Cron('0 */6 * * *')
  async processStaleInvoices() {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    this.logger.log('[OrderInvoiceCron] Checking for stale issued invoices...');

    // ── Find issued invoices older than 12 hours ──────────────
    const staleInvoices = await this.db
      .select({
        invoiceId: invoices.id,
        orderId: invoices.orderId,
        companyId: invoices.companyId,
        issuedAt: invoices.issuedAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'issued'),
          lte(invoices.issuedAt, twelveHoursAgo),
        ),
      )
      .execute();

    if (staleInvoices.length === 0) {
      this.logger.log('[OrderInvoiceCron] No stale invoices found.');
      return;
    }

    this.logger.log(
      `[OrderInvoiceCron] Found ${staleInvoices.length} stale invoices — processing...`,
    );

    // ── Filter to only those linked to an order ───────────────
    const withOrder = staleInvoices.filter((inv) => !!inv.orderId);

    // ── Group by companyId for cache busting ──────────────────
    const companyIds = new Set<string>();
    let updated = 0;

    for (const inv of withOrder) {
      try {
        await this.db.transaction(async (trx) => {
          // ── Check order current status ──────────────────────
          const [order] = await trx
            .select({ id: orders.id, status: orders.status })
            .from(orders)
            .where(
              and(
                eq(orders.companyId, inv.companyId),
                eq(orders.id, inv.orderId!),
              ),
            )
            .for('update')
            .limit(1)
            .execute();

          if (!order) return;

          // ── Only update draft orders ────────────────────────
          if (order.status !== 'draft') return;

          // ── Update order to pending_payment ──────────────────
          await trx
            .update(orders)
            .set({
              status: 'pending_payment',
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(orders.companyId, inv.companyId),
                eq(orders.id, inv.orderId!),
              ),
            )
            .execute();

          // ── Log order event ───────────────────────────────────
          await trx
            .insert(orderEvents)
            .values({
              companyId: inv.companyId,
              orderId: inv.orderId!,
              type: 'status_changed',
              fromStatus: 'draft',
              toStatus: 'pending_payment',
              message: `Invoice issued over 12 hours ago — order moved to pending payment`,
            })
            .execute();
        });

        companyIds.add(inv.companyId);
        updated++;

        this.logger.log(
          `[OrderInvoiceCron] Order ${inv.orderId} → pending_payment (invoice ${inv.invoiceId} issued ${inv.issuedAt})`,
        );
      } catch (err: any) {
        this.logger.error(
          `[OrderInvoiceCron] Failed to process invoice ${inv.invoiceId}: ${err.message}`,
        );
      }
    }

    // ── Bust cache for all affected companies ─────────────────
    for (const companyId of companyIds) {
      await this.cache.bumpCompanyVersion(companyId);
    }

    this.logger.log(
      `[OrderInvoiceCron] Done — ${updated}/${withOrder.length} orders updated to pending_payment`,
    );
  }
}
