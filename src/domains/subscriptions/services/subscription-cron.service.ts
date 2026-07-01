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
import { and, eq, lte, gte, ne, sql } from 'drizzle-orm';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { SubscriptionNotificationService } from 'src/domains/notification/services/subscription-notification.service';
import { format } from 'date-fns';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly subscriptions: CompanySubscriptionsService,
    private readonly notifications: SubscriptionNotificationService,
  ) {}

  // ── Run daily at midnight ─────────────────────────────────
  @Cron('0 9 * * *')
  async processExpiredSubscriptions() {
    const now = new Date();
    this.logger.log('[SubscriptionCron] Checking expired subscriptions...');

    // ── Day 0: period just ended — send invoice, keep active ──
    // Compare dates (not timestamps) so a midnight period_end isn't missed
    // when the cron runs at 9am (which would be outside a 24h lookback window).
    const justExpired = await this.db
      .select({
        companyId: companySubscriptions.companyId,
        billingCycle: companySubscriptions.billingCycle,
        planName: subscriptionPlans.name,
        monthlyPriceNGN: subscriptionPlans.monthlyPriceNGN,
        annualPriceNGN: subscriptionPlans.annualPriceNGN,
      })
      .from(companySubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(companySubscriptions.planId, subscriptionPlans.id),
      )
      .where(
        and(
          eq(companySubscriptions.status, 'active'),
          sql`${companySubscriptions.currentPeriodEnd}::date = (now() - interval '1 day')::date`,
        ),
      )
      .execute();

    for (const row of justExpired) {
      try {
        const recipients = await this.getBillingRecipients(row.companyId);
        if (!recipients.length) continue;

        const amountNGN =
          row.billingCycle === 'annual'
            ? row.annualPriceNGN
            : row.monthlyPriceNGN;

        const period = format(now, 'MMMM yyyy');

        for (const recipient of recipients) {
          await this.notifications.sendSubscriptionInvoice({
            email: recipient.email,
            ownerName: `${recipient.firstName} ${recipient.lastName}`.trim(),
            companyName: recipient.companyName,
            planName: row.planName,
            amountNGN,
            period,
            daysUntilExpiry: 10,
          });
        }

        this.logger.log(
          `[SubscriptionCron] Invoice sent to ${recipients.length} recipient(s): ${row.companyId}`,
        );
      } catch (err: any) {
        this.logger.error(
          `[SubscriptionCron] Failed to send invoice for ${row.companyId}: ${err?.message}`,
        );
      }
    }

    // ── Day 3: flip active → past_due (3-day grace period) ───
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const overdueActive = await this.db
      .select({ companyId: companySubscriptions.companyId })
      .from(companySubscriptions)
      .innerJoin(
        subscriptionPlans,
        eq(companySubscriptions.planId, subscriptionPlans.id),
      )
      .where(
        and(
          eq(companySubscriptions.status, 'active'),
          lte(companySubscriptions.currentPeriodEnd, threeDaysAgo),
        ),
      )
      .execute();

    for (const { companyId } of overdueActive) {
      await this.subscriptions.markPastDue(companyId);
      this.logger.log(`[SubscriptionCron] Active → past_due: ${companyId}`);
    }

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

    // ── Expire past_due after 10 days ─────────────────────────
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

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
          lte(companySubscriptions.currentPeriodEnd, tenDaysAgo),
          ne(subscriptionPlans.name, 'Custom'),
        ),
      )
      .execute();

    for (const { companyId } of expiredPastDue) {
      await this.subscriptions.markExpired(companyId);
      this.logger.log(`[SubscriptionCron] Past due expired: ${companyId}`);
    }

    this.logger.log(
      `[SubscriptionCron] Done — ${overdueActive.length} active→past_due, ${expiredTrials.length} trials expired, ${expiredPastDue.length} past_due expired`,
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
        const recipients = await this.getBillingRecipients(row.companyId);
        if (!recipients.length) continue;

        for (const recipient of recipients) {
          await this.notifications.sendTrialEnding({
            email: recipient.email,
            ownerName: `${recipient.firstName} ${recipient.lastName}`.trim(),
            companyName: recipient.companyName,
            daysLeft: days,
            trialEndsAt: new Date(row.trialEndsAt!),
          });
        }

        trialRemindersSent += recipients.length;
        this.logger.log(
          `[SubscriptionCron] Trial reminder sent to ${recipients.length} recipient(s) — ${days} days left`,
        );
      }
    }

    // ── Past due reminders every 3 days + urgent final days ───
    // Custom plan INCLUDED — they should still get payment reminders
    const pastDueReminderDays = [3, 5, 7, 9];

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
        const recipients = await this.getBillingRecipients(row.companyId);
        if (!recipients.length) continue;

        const daysUntilExpiry = 10 - daysSince;

        for (const recipient of recipients) {
          await this.notifications.sendPastDue({
            email: recipient.email,
            ownerName: `${recipient.firstName} ${recipient.lastName}`.trim(),
            companyName: recipient.companyName,
            planName: row.planName,
            daysUntilExpiry,
          });
        }

        pastDueRemindersSent += recipients.length;
        this.logger.log(
          `[SubscriptionCron] Past due reminder sent to ${recipients.length} recipient(s) — ${daysUntilExpiry} days until expiry`,
        );
      }
    }

    this.logger.log(
      `[SubscriptionCron] Reminders sent — ${trialRemindersSent} trial + ${pastDueRemindersSent} past_due`,
    );
  }

  // ── Get all owners for a company ─────────────────────────
  private async getBillingRecipients(companyId: string) {
    return this.db
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
      .execute();
  }
}
