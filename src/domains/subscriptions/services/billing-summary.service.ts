// src/domains/subscriptions/services/billing-summary.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  companySubscriptions,
  creditTopupRequests,
  subscriptionInvoices,
} from 'src/infrastructure/drizzle/schema';
import { SubscriptionPlansService } from './subscription-plans.service';

@Injectable()
export class BillingSummaryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly plans: SubscriptionPlansService,
  ) {}

  async get(companyId: string) {
    // ── All in parallel ───────────────────────────────────────
    const [subRows, topups, invoices, allPlans] = await Promise.all([
      this.db
        .select()
        .from(companySubscriptions)
        .where(eq(companySubscriptions.companyId, companyId))
        .limit(1)
        .execute(),

      this.db
        .select()
        .from(creditTopupRequests)
        .where(eq(creditTopupRequests.companyId, companyId))
        .orderBy(desc(creditTopupRequests.createdAt))
        .execute(),

      this.db
        .select()
        .from(subscriptionInvoices)
        .where(eq(subscriptionInvoices.companyId, companyId))
        .orderBy(desc(subscriptionInvoices.createdAt))
        .execute(),

      this.plans.getAll(),
    ]);

    const sub = subRows[0] ?? null;
    const plan = sub
      ? (allPlans.find((p) => p.id === sub.planId) ?? null)
      : null;

    return {
      subscription: sub && plan ? { ...sub, plan } : null,
      plans: allPlans,
      topups,
      invoices,
    };
  }
}
