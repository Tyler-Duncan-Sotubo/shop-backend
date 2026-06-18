// src/domains/subscriptions/services/subscription-cron.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { companySubscriptions } from 'src/infrastructure/drizzle/schema';
import { and, eq, lte, or } from 'drizzle-orm';
import { CompanySubscriptionsService } from './company-subscriptions.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly subscriptions: CompanySubscriptionsService,
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
      .where(
        and(
          eq(companySubscriptions.status, 'trialing'),
          lte(companySubscriptions.trialEndsAt, now),
        ),
      )
      .execute();

    for (const { companyId } of expiredTrials) {
      await this.subscriptions.markExpired(companyId);
      this.logger.log(`[SubscriptionCron] Trial expired: ${companyId}`);
    }

    // ── Expire past_due subscriptions after 7 days ────────────
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const expiredPastDue = await this.db
      .select({ companyId: companySubscriptions.companyId })
      .from(companySubscriptions)
      .where(
        and(
          eq(companySubscriptions.status, 'past_due'),
          lte(companySubscriptions.currentPeriodEnd, sevenDaysAgo),
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
}
