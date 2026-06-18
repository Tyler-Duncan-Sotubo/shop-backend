// src/domains/subscriptions/services/subscription-payment.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  subscriptionPlans,
  subscriptionInvoices,
} from 'src/infrastructure/drizzle/schema';
import { BillingPaystackService } from './billing-paystack.service';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';
import { CreditService } from 'src/domains/credits/credits.service';
import { nanoid } from 'nanoid';

@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly billingPaystack: BillingPaystackService,
    private readonly subscriptions: CompanySubscriptionsService,
    private readonly plans: SubscriptionPlansService,
    private readonly credits: CreditService,
  ) {}

  // ── Initiate plan subscription payment ───────────────────
  async initiate(
    companyId: string,
    userEmail: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
  ) {
    const [plan] = await this.db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1)
      .execute();

    if (!plan) throw new BadRequestException('Plan not found.');

    if (plan.name === 'Custom' || plan.name === 'Free') {
      throw new BadRequestException('This plan cannot be purchased online.');
    }

    const amountNGN =
      billingCycle === 'annual' ? plan.annualPriceNGN : plan.monthlyPriceNGN;

    if (amountNGN <= 0) {
      throw new BadRequestException('Invalid plan amount.');
    }

    const reference = `SUB-${nanoid(12).toUpperCase()}`;

    const result = await this.billingPaystack.initializeTransaction({
      email: userEmail,
      amountNGN,
      reference,
      callbackUrl: `${process.env.FRONTEND_URL}/billing?sub=success`,
      metadata: {
        companyId,
        planId,
        planName: plan.name,
        billingCycle,
        type: 'subscription_payment',
      },
    });

    this.logger.log(
      `[SubscriptionPayment] Initiated ${plan.name} ${billingCycle} for company ${companyId} ref: ${reference}`,
    );

    return {
      reference,
      authorizationUrl: result.data.authorizationUrl,
      accessCode: result.data.accessCode,
      planName: plan.name,
      amountNGN,
      billingCycle,
    };
  }

  // ── Confirm after webhook charge.success ──────────────────
  async confirm(
    companyId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual',
    paystackReference: string,
    amountNGN: number,
    paystackCustomerCode?: string, // ← add
  ): Promise<void> {
    await this.subscriptions.activate(
      companyId,
      planId,
      billingCycle,
      undefined, // paystackSubscriptionCode — not available on one-time charge
      paystackCustomerCode, // ← save customer code
      undefined, // paystackEmailToken — not available on one-time charge
    );

    const plan = await this.plans.getById(planId);
    if (plan.monthlyCredits > 0) {
      await this.credits.topUp(
        companyId,
        plan.monthlyCredits,
        'email',
        `Plan credits — ${plan.name}`,
      );
    }

    await this.db
      .insert(subscriptionInvoices)
      .values({
        companyId,
        type: 'subscription',
        status: 'paid',
        amountNGN,
        paystackReference,
        paidAt: new Date(),
      })
      .execute();

    this.logger.log(
      `[SubscriptionPayment] Confirmed ${plan.name} for company ${companyId}`,
    );
  }

  async verifyAndConfirm(companyId: string, reference: string): Promise<void> {
    const result = await this.billingPaystack.verifyTransaction(reference);

    if (!result.verified) {
      throw new BadRequestException(
        `Payment not verified. Status: ${result.status}`,
      );
    }

    const meta = result.metadata as any;
    const planId = meta?.planId;
    const billingCycle = meta?.billingCycle ?? 'monthly';
    const amountNGN = result.amountNGN ?? 0;
    const paystackCustomerCode = result.customer?.customer_code ?? undefined; // ← extract

    if (!planId) {
      throw new BadRequestException('Plan ID missing from payment metadata.');
    }

    await this.confirm(
      companyId,
      planId,
      billingCycle,
      reference,
      amountNGN,
      paystackCustomerCode, // ← pass through
    );
  }

  // subscription-payment.service.ts — add
  async initiateRenewal(
    companyId: string,
    userEmail: string,
  ): Promise<{ reference: string; authorizationUrl: string }> {
    // ── Get current subscription + plan ──────────────────────
    const sub = await this.subscriptions.getByCompanyOrThrow(companyId);
    const plan = await this.plans.getById(sub.planId);

    if (plan.name === 'Custom' || plan.name === 'Free') {
      throw new BadRequestException('This plan cannot be renewed online.');
    }

    const amountNGN =
      sub.billingCycle === 'annual'
        ? plan.annualPriceNGN
        : plan.monthlyPriceNGN;

    if (amountNGN <= 0) {
      throw new BadRequestException('Invalid plan amount.');
    }

    const reference = `REN-${nanoid(12).toUpperCase()}`;

    const result = await this.billingPaystack.initializeTransaction({
      email: userEmail,
      amountNGN,
      reference,
      callbackUrl: `${process.env.FRONTEND_URL}/billing?sub=success`,
      metadata: {
        companyId,
        planId: sub.planId,
        planName: plan.name,
        billingCycle: sub.billingCycle,
        type: 'subscription_payment', // ← same type so webhook/verify handles it
      },
    });

    this.logger.log(
      `[SubscriptionPayment] Renewal initiated ${plan.name} for company ${companyId} ref: ${reference}`,
    );

    return {
      reference,
      authorizationUrl: result.data.authorizationUrl,
    };
  }
}
