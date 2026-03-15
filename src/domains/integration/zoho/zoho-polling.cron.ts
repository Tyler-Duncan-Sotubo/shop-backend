// src/domains/integration/zoho/zoho-polling.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { and, desc, eq, isNotNull, isNull, notInArray, or } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import type { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  invoices,
  orders,
  payments,
  paymentAllocations,
} from 'src/infrastructure/drizzle/schema';
import { ZohoService } from './zoho.service';
import { getZohoApiBase } from './zoho.oauth';

type ZohoInvoiceGetResponse = {
  invoice?: {
    invoice_id: string;
    status?: string;
    balance?: number; // major
    amount_paid?: number; // major
    invoice_number?: string;
  };
};

function majorToMinor(major: number) {
  return Math.round(Number(major) * 100);
}

@Injectable()
export class ZohoPollingCron {
  private readonly logger = new Logger(ZohoPollingCron.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly zohoService: ZohoService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async pollZohoInvoiceStatuses() {
    const candidates = await this.db
      .select({
        id: invoices.id,
        companyId: invoices.companyId,
        storeId: invoices.storeId,
        zohoInvoiceId: invoices.zohoInvoiceId,
        zohoInvoiceStatus: invoices.zohoInvoiceStatus,
        issuedAt: invoices.issuedAt,
      })
      .from(invoices)
      .where(
        and(
          isNotNull(invoices.zohoInvoiceId),
          isNotNull(invoices.storeId),
          isNotNull(invoices.issuedAt), // issued/locked only
          isNull(invoices.voidedAt),
          or(
            isNull(invoices.zohoInvoiceStatus),
            notInArray(invoices.zohoInvoiceStatus, [
              'paid',
              'void',
              'written_off',
            ]),
          ),
        ),
      )
      .orderBy(desc(invoices.issuedAt))
      .limit(250)
      .execute();

    if (!candidates.length) return;

    // group by companyId+storeId
    const groups = new Map<string, typeof candidates>();
    for (const c of candidates) {
      const key = `${c.companyId}:${c.storeId}`;
      const arr = groups.get(key) ?? [];
      arr.push(c);
      groups.set(key, arr);
    }

    for (const [, group] of groups) {
      const companyId = group[0].companyId as string;
      const storeId = group[0].storeId as string;

      let connection: any;
      try {
        connection = await this.zohoService.findForStore(companyId, storeId);
        if (!connection?.isActive || !connection?.zohoOrganizationId) continue;
      } catch (e: any) {
        this.logger.warn(
          `Zoho connection not found/active for ${companyId}/${storeId}: ${e?.message ?? e}`,
        );
        continue;
      }

      // ✅ REQUIRED call shape
      let accessToken: string;
      try {
        const quote = { storeId };
        accessToken = await this.zohoService.getValidAccessToken(
          companyId,
          quote.storeId,
        );
      } catch (e: any) {
        this.logger.warn(
          `Token refresh failed for ${companyId}/${storeId}: ${e?.message ?? e}`,
        );
        continue;
      }

      const base = getZohoApiBase(connection.region);
      const orgId = connection.zohoOrganizationId;

      // throttle per org per run
      const queue = group.slice(0, 80);

      for (const c of queue) {
        const zohoInvoiceId = c.zohoInvoiceId as string;
        if (!zohoInvoiceId) continue;

        try {
          const res = await axios.get<ZohoInvoiceGetResponse>(
            `${base}/books/v3/invoices/${zohoInvoiceId}`,
            {
              headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
              params: { organization_id: orgId },
            },
          );

          const z = res.data?.invoice;
          if (!z?.invoice_id) continue;

          const nextZohoStatus = (z.status ?? '').toLowerCase().trim() || null;
          const nextPaidMinor =
            z.amount_paid != null ? majorToMinor(Number(z.amount_paid)) : null;
          const nextBalanceMinor =
            z.balance != null ? majorToMinor(Number(z.balance)) : null;

          await this.db.transaction(async (tx) => {
            // lock invoice
            const [inv] = await tx
              .select({
                id: invoices.id,
                companyId: invoices.companyId,
                storeId: invoices.storeId,
                orderId: invoices.orderId,
                status: invoices.status,
                totalMinor: invoices.totalMinor,
                paidMinor: invoices.paidMinor,
                balanceMinor: invoices.balanceMinor,
                zohoInvoiceStatus: invoices.zohoInvoiceStatus,
                zohoInvoiceId: invoices.zohoInvoiceId,
              })
              .from(invoices)
              .where(
                and(eq(invoices.companyId, companyId), eq(invoices.id, c.id)),
              )
              .for('update')
              .execute();

            if (!inv) return;

            const prevZohoStatus = (inv.zohoInvoiceStatus ?? '')
              .toLowerCase()
              .trim();

            const zohoStatusChanged =
              !!nextZohoStatus && nextZohoStatus !== prevZohoStatus;

            // update Zoho tracking fields (always if changed / amounts present)
            const patch: any = {
              zohoOrganizationId: orgId,
              zohoInvoiceStatus: nextZohoStatus ?? inv.zohoInvoiceStatus,
              zohoInvoiceNumber: (z.invoice_number ?? null) as any,
              zohoSyncedAt: new Date() as any,
              zohoSyncError: null as any,
              updatedAt: new Date(),
            };

            if (nextPaidMinor != null) patch.paidMinor = nextPaidMinor;
            if (nextBalanceMinor != null) patch.balanceMinor = nextBalanceMinor;

            // --- Payment logic (mark invoice + order paid, create payment ledger once) ---
            // Trigger only when Zoho says paid AND we are not yet paid internally.
            if (nextZohoStatus === 'paid' && inv.status !== 'paid') {
              const totalMinor = Number(inv.totalMinor ?? 0);
              const alreadyPaidMinor = Number(inv.paidMinor ?? 0);
              const remainingMinor = Math.max(totalMinor - alreadyPaidMinor, 0);

              // If we still have remaining, record a single "Zoho" payment + allocation
              if (remainingMinor > 0) {
                const ref = `zoho:${zohoInvoiceId}`;

                // idempotency: if a zoho payment already exists for this invoice/ref, skip insert
                const [existingZohoPay] = await tx
                  .select({ id: payments.id })
                  .from(payments)
                  .where(
                    and(
                      eq(payments.companyId, companyId),
                      eq(payments.invoiceId, inv.id),
                      eq(payments.provider, 'zoho' as any),
                      eq(payments.providerRef, ref as any),
                      eq(payments.status, 'succeeded' as any),
                    ),
                  )
                  .limit(1)
                  .execute();

                if (!existingZohoPay) {
                  const [p] = await tx
                    .insert(payments)
                    .values({
                      companyId,
                      orderId: inv.orderId ?? null,
                      invoiceId: inv.id,
                      method: 'bank_transfer' as any,
                      status: 'succeeded' as any,
                      currency: 'NGN',
                      amountMinor: remainingMinor,
                      reference: ref,
                      provider: 'zoho' as any,
                      providerRef: ref,
                      receivedAt: new Date(),
                      confirmedAt: new Date(),
                      meta: { source: 'zoho_poll' } as any,
                    } as any)
                    .returning({ id: payments.id })
                    .execute();

                  await tx.insert(paymentAllocations).values({
                    companyId,
                    paymentId: p.id,
                    invoiceId: inv.id,
                    status: 'applied' as any,
                    amountMinor: remainingMinor,
                    createdByUserId: null,
                  } as any);
                }
              }

              // enforce internal paid totals/status
              patch.paidMinor = Number(inv.totalMinor ?? 0);
              patch.balanceMinor = 0;
              patch.status = 'paid';

              // order paid (if linked)
              if (inv.orderId) {
                await tx
                  .update(orders)
                  .set({
                    status: 'paid' as any,
                    paidAt: new Date() as any,
                    updatedAt: new Date(),
                  } as any)
                  .where(
                    and(
                      eq(orders.companyId, companyId),
                      eq(orders.id, inv.orderId),
                    ),
                  )
                  .execute();
              }
            }

            // If nothing changed and no amounts and not paid transition, skip write
            if (
              !zohoStatusChanged &&
              nextPaidMinor == null &&
              nextBalanceMinor == null &&
              !(nextZohoStatus === 'paid' && inv.status !== 'paid')
            ) {
              return;
            }

            await tx
              .update(invoices)
              .set(patch)
              .where(
                and(eq(invoices.companyId, companyId), eq(invoices.id, inv.id)),
              )
              .execute();
          });
        } catch (e: any) {
          const msg =
            e?.response?.data?.message ??
            e?.response?.data?.error ??
            e?.message ??
            String(e);

          await this.db
            .update(invoices)
            .set({
              zohoSyncError: `Polling failed: ${msg}` as any,
              updatedAt: new Date(),
            } as any)
            .where(
              and(eq(invoices.companyId, companyId), eq(invoices.id, c.id)),
            )
            .execute();

          this.logger.warn(
            `Poll failed invoice ${c.id} (Zoho ${zohoInvoiceId}): ${msg}`,
          );
        }
      }
    }
  }
}
