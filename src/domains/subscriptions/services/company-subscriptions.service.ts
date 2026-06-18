// src/domains/subscriptions/services/company-subscriptions.service.ts
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { companySubscriptions } from 'src/infrastructure/drizzle/schema';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CacheService } from 'src/infrastructure/cache/cache.service';

const SUB_CACHE_KEY = 'subscription:with-plan';
const SUB_TTL = 60 * 5; // 5 minutes

@Injectable()
export class CompanySubscriptionsService {
  private readonly logger = new Logger(CompanySubscriptionsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly plans: SubscriptionPlansService,
    private readonly cache: CacheService,
  ) {}

  // ── Invalidate subscription cache ─────────────────────────
  private async bust(companyId: string): Promise<void> {
    await this.cache.bumpCompanyVersion(companyId);
  }

  // ── Start trial ───────────────────────────────────────────
  async startTrial(companyId: string): Promise<void> {
    const freePlan = await this.plans.getFreePlan();

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 14);

    await this.db
      .insert(companySubscriptions)
      .values({
        companyId,
        planId: freePlan.id,
        status: 'trialing',
        billingCycle: 'monthly',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
      })
      .onConflictDoNothing()
      .execute();

    await this.bust(companyId);

    this.logger.log(
      `[Subscriptions] Trial started for company ${companyId} — ends ${trialEndsAt.toISOString()}`,
    );
  }

  // ── Get current subscription ──────────────────────────────
  async getByCompany(companyId: string) {
    const [sub] = await this.db
      .select()
      .from(companySubscriptions)
      .where(eq(companySubscriptions.companyId, companyId))
      .limit(1)
      .execute();

    return sub ?? null;
  }

  async getByCompanyOrThrow(companyId: string) {
    const sub = await this.getByCompany(companyId);
    if (!sub) throw new NotFoundException('No subscription found.');
    return sub;
  }

  // ── Get with plan — cached ────────────────────────────────
  async getWithPlan(companyId: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      [SUB_CACHE_KEY],
      async () => {
        const sub = await this.getByCompany(companyId);
        if (!sub) return null;
        const plan = await this.plans.getById(sub.planId);
        return { ...sub, plan };
      },
      { ttlSeconds: SUB_TTL },
    );
  }

  // ── Activate subscription after payment ──────────────────
  async activate(
    companyId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    paystackSubscriptionCode?: string,
    paystackCustomerCode?: string,
    paystackEmailToken?: string,
  ): Promise<void> {
    const now = new Date();

    // ── Get existing sub to check original period end ─────────
    const existing = await this.getByCompany(companyId);

    // ── Calculate next period end from original due date ──────
    // If they paid late, next billing is still from the original date
    // e.g. due June 1, paid June 19 → next due July 1
    const baseDate =
      existing?.currentPeriodEnd && new Date(existing.currentPeriodEnd) < now
        ? new Date(existing.currentPeriodEnd) // ← use original due date
        : now; // ← new sub, use today

    const periodEnd = new Date(baseDate);

    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await this.db
      .update(companySubscriptions)
      .set({
        planId,
        status: 'active',
        billingCycle,
        currentPeriodStart: now, // ← when they actually paid
        currentPeriodEnd: periodEnd, // ← next due from original date
        trialEndsAt: null,
        paystackSubscriptionCode: paystackSubscriptionCode ?? null,
        paystackCustomerCode: paystackCustomerCode ?? null,
        paystackEmailToken: paystackEmailToken ?? null,
        updatedAt: now,
      })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();

    await this.bust(companyId);

    this.logger.log(
      `[Subscriptions] Activated plan ${planId} for company ${companyId} — next due ${periodEnd.toISOString()}`,
    );
  }

  // ── Renew subscription ────────────────────────────────────
  async renew(companyId: string): Promise<void> {
    const sub = await this.getByCompanyOrThrow(companyId);
    const now = new Date();

    // ── Base from original period end, not today ──────────────
    const baseDate =
      sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < now
        ? new Date(sub.currentPeriodEnd)
        : now;

    const periodEnd = new Date(baseDate);

    if (sub.billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await this.db
      .update(companySubscriptions)
      .set({
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();

    await this.bust(companyId);

    this.logger.log(
      `[Subscriptions] Renewed for company ${companyId} — next due ${periodEnd.toISOString()}`,
    );
  }

  // ── Mark past due ─────────────────────────────────────────
  async markPastDue(companyId: string): Promise<void> {
    await this.db
      .update(companySubscriptions)
      .set({ status: 'past_due', updatedAt: new Date() })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();

    await this.bust(companyId);
  }

  // ── Mark expired ──────────────────────────────────────────
  async markExpired(companyId: string): Promise<void> {
    await this.db
      .update(companySubscriptions)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();

    await this.bust(companyId);
  }

  // ── Cancel ────────────────────────────────────────────────
  async cancel(companyId: string, reason?: string): Promise<void> {
    await this.db
      .update(companySubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();

    await this.bust(companyId);

    this.logger.log(
      `[Subscriptions] Cancelled subscription for company ${companyId}`,
    );
  }

  // ── Assign custom plan (Godfather/enterprise) ─────────────
  async assignCustomPlan(companyId: string): Promise<void> {
    const customPlan = await this.plans.getByName('Custom');
    if (!customPlan) throw new NotFoundException('Custom plan not found.');

    const now = new Date();
    const periodEnd = new Date();
    periodEnd.setFullYear(periodEnd.getFullYear() + 100);

    const existing = await this.getByCompany(companyId);

    if (existing) {
      await this.db
        .update(companySubscriptions)
        .set({
          planId: customPlan.id,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          updatedAt: now,
        })
        .where(eq(companySubscriptions.companyId, companyId))
        .execute();
    } else {
      await this.db
        .insert(companySubscriptions)
        .values({
          companyId,
          planId: customPlan.id,
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        })
        .execute();
    }

    await this.bust(companyId);

    this.logger.log(
      `[Subscriptions] Custom plan assigned to company ${companyId}`,
    );
  }

  // ── Check if active ───────────────────────────────────────
  async isActive(companyId: string): Promise<boolean> {
    const sub = await this.getByCompany(companyId);
    if (!sub) return false;
    return ['trialing', 'active'].includes(sub.status);
  }
}
