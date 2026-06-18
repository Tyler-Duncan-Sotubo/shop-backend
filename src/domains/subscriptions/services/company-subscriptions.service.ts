// src/domains/subscriptions/services/company-subscriptions.service.ts
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { companySubscriptions } from 'src/infrastructure/drizzle/schema';
import { SubscriptionPlansService } from './subscription-plans.service';

@Injectable()
export class CompanySubscriptionsService {
  private readonly logger = new Logger(CompanySubscriptionsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly plans: SubscriptionPlansService,
  ) {}

  // ── Start trial — called when company registers ───────────
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
      .onConflictDoNothing() // safe to call multiple times
      .execute();

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
    const periodEnd = new Date();

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
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEndsAt: null,
        paystackSubscriptionCode: paystackSubscriptionCode ?? null,
        paystackCustomerCode: paystackCustomerCode ?? null,
        paystackEmailToken: paystackEmailToken ?? null,
        updatedAt: now,
      })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();

    this.logger.log(
      `[Subscriptions] Activated plan ${planId} for company ${companyId}`,
    );
  }

  // ── Renew subscription (called by Paystack webhook) ───────
  async renew(companyId: string): Promise<void> {
    const sub = await this.getByCompanyOrThrow(companyId);

    const now = new Date();
    const periodEnd = new Date();

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

    this.logger.log(
      `[Subscriptions] Renewed subscription for company ${companyId}`,
    );
  }

  // ── Mark past due ─────────────────────────────────────────
  async markPastDue(companyId: string): Promise<void> {
    await this.db
      .update(companySubscriptions)
      .set({ status: 'past_due', updatedAt: new Date() })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();
  }

  // ── Mark expired ──────────────────────────────────────────
  async markExpired(companyId: string): Promise<void> {
    await this.db
      .update(companySubscriptions)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(companySubscriptions.companyId, companyId))
      .execute();
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

    this.logger.log(
      `[Subscriptions] Cancelled subscription for company ${companyId}`,
    );
  }

  // ── Assign custom plan (for Godfather/enterprise) ─────────
  async assignCustomPlan(companyId: string): Promise<void> {
    const customPlan = await this.plans.getByName('Custom');
    if (!customPlan) throw new NotFoundException('Custom plan not found.');

    const now = new Date();

    // Set period end 100 years out — effectively never expires
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

    this.logger.log(
      `[Subscriptions] Custom plan assigned to company ${companyId}`,
    );
  }

  // ── Get with plan details ─────────────────────────────────
  async getWithPlan(companyId: string) {
    const sub = await this.getByCompany(companyId);
    if (!sub) return null;

    const plan = await this.plans.getById(sub.planId);

    return { ...sub, plan };
  }

  // ── Check if company has active subscription ──────────────
  async isActive(companyId: string): Promise<boolean> {
    const sub = await this.getByCompany(companyId);
    if (!sub) return false;
    return ['trialing', 'active'].includes(sub.status);
  }
}
