// src/domains/subscriptions/services/subscription-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  companySubscriptions,
  subscriptionPlans,
  users,
  companies,
  companyRoles,
} from 'src/infrastructure/drizzle/schema';
import { and, eq, lte, gte, ne } from 'drizzle-orm';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { SubscriptionNotificationService } from 'src/domains/notification/services/subscription-notification.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly subscriptions: CompanySubscriptionsService,
    private readonly notifications: SubscriptionNotificationService,
  ) {}

  // ── Run daily at midnight ─────────────────────────────────
  @Cron('0 0 * * *')
  async processExpiredSubscriptions() {
    const now = new Date();
    this.logger.log('[SubscriptionCron] Checking expired subscriptions...');

    // ── Expire trials ─────────────────────────────────────────
    const expiredTrials = await this.db
      .select({ companyId: companySubscriptions.companyId })
      .from(companySubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(companySubscriptions.planId, subscriptionPlans.id),
      )
      .where(
        and(
          eq(companySubscriptions.status, 'trialing'),
          lte(companySubscriptions.trialEndsAt, now),
          ne(subscriptionPlans.name, 'Custom'),
        ),
      )
      .execute();

    for (const { companyId } of expiredTrials) {
      await this.subscriptions.markExpired(companyId);
      this.logger.log(`[SubscriptionCron] Trial expired: ${companyId}`);
    }

    // ── Expire past_due after 20 days ─────────────────────────
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

    const expiredPastDue = await this.db
      .select({ companyId: companySubscriptions.companyId })
      .from(companySubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(companySubscriptions.planId, subscriptionPlans.id),
      )
      .where(
        and(
          eq(companySubscriptions.status, 'past_due'),
          lte(companySubscriptions.currentPeriodEnd, twentyDaysAgo),
          ne(subscriptionPlans.name, 'Custom'),
        ),
      )
      .execute();

    for (const { companyId } of expiredPastDue) {
      await this.subscriptions.markExpired(companyId);
      this.logger.log(`[SubscriptionCron] Past due expired: ${companyId}`);
    }

    this.logger.log(
      `[SubscriptionCron] Done — ${expiredTrials.length} trials + ${expiredPastDue.length} past_due expired`,
    );
  }

  // ── Run daily at 9am WAT (8am UTC) ───────────────────────
  @Cron('0 9 * * *')
  async sendSubscriptionReminders() {
    const now = new Date();
    this.logger.log('[SubscriptionCron] Sending subscription reminders...');

    let trialRemindersSent = 0;
    let pastDueRemindersSent = 0;

    // ── Trial reminders: 7 days, 3 days, 1 day ───────────────
    // Custom plan excluded — they don't have trials
    const reminderDays = [7, 3, 1];

    for (const days of reminderDays) {
      const windowStart = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      windowStart.setHours(0, 0, 0, 0);

      const windowEnd = new Date(windowStart);
      windowEnd.setHours(23, 59, 59, 999);

      const trialRows = await this.db
        .select({
          companyId: companySubscriptions.companyId,
          trialEndsAt: companySubscriptions.trialEndsAt,
          planName: subscriptionPlans.name,
        })
        .from(companySubscriptions)
        .innerJoin(
          subscriptionPlans,
          eq(companySubscriptions.planId, subscriptionPlans.id),
        )
        .where(
          and(
            eq(companySubscriptions.status, 'trialing'),
            gte(companySubscriptions.trialEndsAt, windowStart),
            lte(companySubscriptions.trialEndsAt, windowEnd),
            ne(subscriptionPlans.name, 'Custom'), // ← Custom can't be trialing anyway
          ),
        )
        .execute();

      for (const row of trialRows) {
        const owner = await this.getCompanyOwner(row.companyId);
        if (!owner) continue;

        await this.notifications.sendTrialEnding({
          email: owner.email,
          ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
          companyName: owner.companyName,
          daysLeft: days,
          trialEndsAt: new Date(row.trialEndsAt!),
        });

        trialRemindersSent++;
        this.logger.log(
          `[SubscriptionCron] Trial reminder sent to ${owner.email} — ${days} days left`,
        );
      }
    }

    // ── Past due reminders every 3 days + urgent final days ───
    // Custom plan INCLUDED — they should still get payment reminders
    const pastDueReminderDays = [1, 4, 7, 10, 13, 16, 18, 19];

    for (const daysSince of pastDueReminderDays) {
      const windowStart = new Date(
        now.getTime() - daysSince * 24 * 60 * 60 * 1000,
      );
      windowStart.setHours(0, 0, 0, 0);

      const windowEnd = new Date(windowStart);
      windowEnd.setHours(23, 59, 59, 999);

      const pastDueRows = await this.db
        .select({
          companyId: companySubscriptions.companyId,
          currentPeriodEnd: companySubscriptions.currentPeriodEnd,
          planName: subscriptionPlans.name,
        })
        .from(companySubscriptions)
        .innerJoin(
          subscriptionPlans,
          eq(companySubscriptions.planId, subscriptionPlans.id),
        )
        .where(
          and(
            eq(companySubscriptions.status, 'past_due'),
            gte(companySubscriptions.currentPeriodEnd, windowStart),
            lte(companySubscriptions.currentPeriodEnd, windowEnd),
            // ← no Custom exclusion here — everyone gets payment reminders
          ),
        )
        .execute();

      for (const row of pastDueRows) {
        const owner = await this.getCompanyOwner(row.companyId);
        if (!owner) continue;

        const daysUntilExpiry = 20 - daysSince;

        await this.notifications.sendPastDue({
          email: owner.email,
          ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
          companyName: owner.companyName,
          planName: row.planName,
          daysUntilExpiry,
        });

        pastDueRemindersSent++;
        this.logger.log(
          `[SubscriptionCron] Past due reminder sent to ${owner.email} — ${daysUntilExpiry} days until expiry`,
        );
      }
    }

    this.logger.log(
      `[SubscriptionCron] Reminders sent — ${trialRemindersSent} trial + ${pastDueRemindersSent} past_due`,
    );
  }

  // ── Get company owner email + name ────────────────────────
  private async getCompanyOwner(companyId: string) {
    const [row] = await this.db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        companyName: companies.name,
      })
      .from(users)
      .innerJoin(companies, eq(users.companyId, companies.id))
      .innerJoin(companyRoles, eq(users.companyRoleId, companyRoles.id))
      .where(
        and(eq(users.companyId, companyId), eq(companyRoles.name, 'owner')),
      )
      .limit(1)
      .execute();

    return row ?? null;
  }
}
