// src/domains/subscriptions/services/subscription-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CreditTopupService } from './credit-topup.service';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { CreditService } from 'src/domains/credits/credits.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { BillingPaystackService } from './billing-paystack.service';
import { SubscriptionPaymentService } from './subscription-payment.service';

@Injectable()
export class SubscriptionWebhookService {
  private readonly logger = new Logger(SubscriptionWebhookService.name);

  constructor(
    private readonly topup: CreditTopupService,
    private readonly subscriptions: CompanySubscriptionsService,
    private readonly credits: CreditService,
    private readonly plans: SubscriptionPlansService,
    private readonly billingPaystack: BillingPaystackService,
    private readonly subscriptionPayment: SubscriptionPaymentService,
  ) {}

  // ── Validate + parse webhook ──────────────────────────────
  processWebhook(rawBody: Buffer, signature: string) {
    return this.billingPaystack.processWebhook(rawBody, signature);
  }

  // ── Handle event ──────────────────────────────────────────
  async handleEvent(event: any): Promise<void> {
    const type = event?.event;
    const data = event?.data;

    this.logger.log(`[SubscriptionWebhook] Event: ${type}`);

    switch (type) {
      // ── Credit topup or subscription payment ──────────────
      case 'charge.success': {
        const meta = data?.metadata;

        if (meta?.type === 'credit_topup') {
          await this.topup.confirm(data.reference);
          break;
        }

        // subscription-webhook.service.ts — charge.success subscription_payment branch
        if (meta?.type === 'subscription_payment') {
          const companyId = meta?.companyId;
          const planId = meta?.planId;
          const billingCycle = meta?.billingCycle ?? 'monthly';
          const amountNGN =
            typeof data?.amount === 'number' ? data.amount / 100 : 0;
          const paystackCustomerCode =
            data?.customer?.customer_code ?? undefined; // ← extract

          if (!companyId || !planId) {
            this.logger.warn(
              '[SubscriptionWebhook] subscription_payment — missing companyId or planId',
            );
            break;
          }

          await this.subscriptionPayment.confirm(
            companyId,
            planId,
            billingCycle,
            data.reference,
            amountNGN,
            paystackCustomerCode, // ← pass through
          );
          break;
        }

        this.logger.debug(
          `[SubscriptionWebhook] charge.success — unknown meta type: ${meta?.type}`,
        );
        break;
      }

      // ── New Paystack subscription created ─────────────────
      // Fires when merchant subscribes via Paystack recurring plan
      case 'subscription.create': {
        const companyId = data?.metadata?.companyId;
        const planId = data?.metadata?.planId;
        const billingCycle = data?.metadata?.billingCycle ?? 'monthly';

        if (!companyId || !planId) {
          this.logger.warn(
            '[SubscriptionWebhook] subscription.create — missing companyId or planId',
          );
          break;
        }

        await this.subscriptions.activate(
          companyId,
          planId,
          billingCycle,
          data?.subscription_code,
          data?.customer?.customer_code,
          data?.email_token,
        );

        await this.topUpPlanCredits(companyId, planId);
        break;
      }

      // ── Payment failed → mark past due ────────────────────
      case 'invoice.payment_failed': {
        const companyId = data?.metadata?.companyId;
        if (!companyId) {
          this.logger.warn(
            '[SubscriptionWebhook] invoice.payment_failed — missing companyId',
          );
          break;
        }
        await this.subscriptions.markPastDue(companyId);
        this.logger.log(`[SubscriptionWebhook] Marked past_due: ${companyId}`);
        break;
      }

      // ── Subscription cancelled via Paystack dashboard ─────
      case 'subscription.disable': {
        const companyId = data?.metadata?.companyId;
        if (!companyId) {
          this.logger.warn(
            '[SubscriptionWebhook] subscription.disable — missing companyId',
          );
          break;
        }
        await this.subscriptions.cancel(
          companyId,
          'Subscription disabled via Paystack',
        );
        this.logger.log(
          `[SubscriptionWebhook] Cancelled subscription: ${companyId}`,
        );
        break;
      }

      default:
        this.logger.debug(`[SubscriptionWebhook] Unhandled event: ${type}`);
    }
  }

  // ── Handle subscription renewal ───────────────────────────
  // Not used directly — renewals come as charge.success with
  // meta.type = 'subscription_payment'
  private async handleSubscriptionRenewal(data: any): Promise<void> {
    const companyId = data?.metadata?.companyId;
    if (!companyId) {
      this.logger.warn('[SubscriptionWebhook] renewal — missing companyId');
      return;
    }

    await this.subscriptions.renew(companyId);

    const sub = await this.subscriptions.getByCompany(companyId);
    if (sub) {
      await this.topUpPlanCredits(companyId, sub.planId);
    }
  }

  // ── Top up plan credits ───────────────────────────────────
  private async topUpPlanCredits(
    companyId: string,
    planId: string,
  ): Promise<void> {
    const plan = await this.plans.getById(planId);
    if (!plan || plan.monthlyCredits === 0) return;

    await this.credits.topUp(
      companyId,
      plan.monthlyCredits,
      'email',
      `Monthly plan credits — ${plan.name}`,
    );

    this.logger.log(
      `[SubscriptionWebhook] Topped up ${plan.monthlyCredits} credits for company ${companyId} — plan: ${plan.name}`,
    );
  }
}
