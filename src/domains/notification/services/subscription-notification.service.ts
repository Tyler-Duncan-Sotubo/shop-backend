// src/domains/notification/services/subscription-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ResendProvider } from '../resend.provider';
import { subscriptionTrialEndingHtml } from '../templates/subscription-trial-ending.html';
import { subscriptionPastDueHtml } from '../templates/subscription-past-due.html';
import { subscriptionInvoiceHtml } from '../templates/subscription-invoice.html';
import { format } from 'date-fns';

const FROM = 'MyCenta <billing@mycenta.com>';

const BILLING_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/billing`
  : 'https://app.mycenta.com/billing';

const PLANS_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/billing/plans`
  : 'https://app.mycenta.com/billing/plans';

@Injectable()
export class SubscriptionNotificationService {
  private readonly logger = new Logger(SubscriptionNotificationService.name);

  constructor(private readonly resend: ResendProvider) {}

  // ── Trial ending reminder ─────────────────────────────────
  async sendTrialEnding(input: {
    email: string;
    ownerName: string;
    companyName: string;
    daysLeft: number;
    trialEndsAt: Date;
  }): Promise<void> {
    const subject =
      input.daysLeft <= 1
        ? 'Your MyCenta trial ends today'
        : `Your MyCenta trial ends in ${input.daysLeft} days`;

    try {
      await this.resend.client.emails.send({
        to: input.email,
        from: FROM,
        subject,
        html: subscriptionTrialEndingHtml({
          companyName: input.companyName,
          ownerName: input.ownerName,
          daysLeft: input.daysLeft,
          trialEndsAt: format(input.trialEndsAt, 'MMM d, yyyy'),
          upgradePlanUrl: PLANS_URL,
        }),
      });

      this.logger.log(
        `[SubscriptionNotification] Trial ending sent to ${input.email} — ${input.daysLeft} days left`,
      );
    } catch (error: any) {
      this.logger.error(
        `[SubscriptionNotification] Failed to send trial ending to ${input.email}`,
        error,
      );
    }
  }

  // ── Subscription invoice with direct payment link ─────────
  async sendSubscriptionInvoice(input: {
    email: string;
    ownerName: string;
    companyName: string;
    planName: string;
    amountNGN: number;
    period: string;
    daysUntilExpiry: number;
  }): Promise<void> {
    try {
      await this.resend.client.emails.send({
        to: input.email,
        from: FROM,
        subject: `Invoice: ${input.planName} subscription — ${input.period}`,
        html: subscriptionInvoiceHtml(input),
      });

      this.logger.log(
        `[SubscriptionNotification] Invoice sent to ${input.email} — ${input.planName} ${input.period}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[SubscriptionNotification] Failed to send invoice to ${input.email}`,
        error,
      );
    }
  }

  // ── Past due reminder ─────────────────────────────────────
  async sendPastDue(input: {
    email: string;
    ownerName: string;
    companyName: string;
    planName: string;
    daysUntilExpiry: number;
  }): Promise<void> {
    try {
      await this.resend.client.emails.send({
        to: input.email,
        from: FROM,
        subject: 'Your MyCenta subscription needs attention',
        html: subscriptionPastDueHtml({
          companyName: input.companyName,
          ownerName: input.ownerName,
          planName: input.planName,
          fixPaymentUrl: BILLING_URL,
          daysUntilExpiry: input.daysUntilExpiry,
        }),
      });

      this.logger.log(
        `[SubscriptionNotification] Past due sent to ${input.email} — ${input.daysUntilExpiry} days until expiry`,
      );
    } catch (error: any) {
      this.logger.error(
        `[SubscriptionNotification] Failed to send past due to ${input.email}`,
        error,
      );
    }
  }
}
