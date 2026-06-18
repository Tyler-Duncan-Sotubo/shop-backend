// src/domains/subscriptions/services/credit-topup.service.ts
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import {
  creditTopupRequests,
  subscriptionInvoices,
} from 'src/infrastructure/drizzle/schema';
import { CreditService } from 'src/domains/credits/credits.service';
import { nanoid } from 'nanoid';
import { BillingPaystackService } from './billing-paystack.service';

// ── Credit bundles ────────────────────────────────────────────
export const CREDIT_BUNDLES = [
  { credits: 1000, amountNGN: 3000, label: '1,000 credits' },
  { credits: 5000, amountNGN: 12500, label: '5,000 credits' },
  { credits: 10000, amountNGN: 22000, label: '10,000 credits' },
  { credits: 25000, amountNGN: 50000, label: '25,000 credits' },
] as const;

export type CreditBundle = (typeof CREDIT_BUNDLES)[number];

@Injectable()
export class CreditTopupService {
  private readonly logger = new Logger(CreditTopupService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    private readonly credits: CreditService,
    private readonly billingPaystack: BillingPaystackService,
  ) {}

  // ── Get available bundles ─────────────────────────────────
  getBundles() {
    return CREDIT_BUNDLES;
  }

  // ── Initiate — creates Paystack transaction ───────────────
  async initiate(companyId: string, userEmail: string, credits: number) {
    const bundle = CREDIT_BUNDLES.find((b) => b.credits === credits);
    if (!bundle) {
      throw new BadRequestException(
        `Invalid credit bundle. Available: ${CREDIT_BUNDLES.map((b) => b.credits).join(', ')}`,
      );
    }

    const reference = `TOPUP-${nanoid(12).toUpperCase()}`;

    // ── Create pending topup request ──────────────────────────
    const [request] = await this.db
      .insert(creditTopupRequests)
      .values({
        companyId,
        credits: bundle.credits,
        amountNGN: bundle.amountNGN,
        status: 'pending',
        paystackReference: reference,
        metadata: { label: bundle.label, initiatedBy: userEmail },
      })
      .returning()
      .execute();

    // ── Initialize Paystack transaction ───────────────────────
    const result = await this.billingPaystack.initializeTransaction({
      email: userEmail,
      amountNGN: bundle.amountNGN,
      reference,
      callbackUrl: `${process.env.FRONTEND_URL}/marketing/credits?topup=success`,
      metadata: {
        companyId,
        credits: bundle.credits,
        type: 'credit_topup',
        requestId: request.id,
      },
    });

    // ── Save access code ──────────────────────────────────────
    await this.db
      .update(creditTopupRequests)
      .set({ paystackAccessCode: result.data.accessCode })
      .where(eq(creditTopupRequests.id, request.id))
      .execute();

    this.logger.log(
      `[CreditTopup] Initiated ${bundle.credits} credits for company ${companyId} ref: ${reference}`,
    );

    return {
      reference,
      authorizationUrl: result.data.authorizationUrl,
      accessCode: result.data.accessCode,
      credits: bundle.credits,
      amountNGN: bundle.amountNGN,
    };
  }

  // ── Confirm — called by Paystack webhook ──────────────────
  async confirm(paystackReference: string): Promise<void> {
    const [request] = await this.db
      .select()
      .from(creditTopupRequests)
      .where(eq(creditTopupRequests.paystackReference, paystackReference))
      .limit(1)
      .execute();

    if (!request) {
      throw new NotFoundException(
        `Topup request not found for reference: ${paystackReference}`,
      );
    }

    // ── Idempotent — safe to call twice ───────────────────────
    if (request.status === 'paid') {
      this.logger.warn(`[CreditTopup] Already confirmed: ${paystackReference}`);
      return;
    }

    // ── Mark paid ─────────────────────────────────────────────
    await this.db
      .update(creditTopupRequests)
      .set({
        status: 'paid',
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creditTopupRequests.id, request.id))
      .execute();

    // ── Add credits to company balance ────────────────────────
    await this.credits.topUp(
      request.companyId,
      request.credits,
      'email',
      `Credit topup — ${request.credits} credits purchased`,
    );

    // ── Create invoice record ─────────────────────────────────
    await this.db
      .insert(subscriptionInvoices)
      .values({
        companyId: request.companyId,
        topupRequestId: request.id,
        type: 'credit_topup',
        status: 'paid',
        amountNGN: request.amountNGN,
        paystackReference,
        paidAt: new Date(),
      })
      .execute();

    this.logger.log(
      `[CreditTopup] Confirmed ${request.credits} credits for company ${request.companyId} ref: ${paystackReference}`,
    );
  }

  // ── Verify via Paystack API (fallback for missed webhooks) ─
  async verifyAndConfirm(
    companyId: string,
    paystackReference: string,
  ): Promise<void> {
    const result =
      await this.billingPaystack.verifyTransaction(paystackReference);

    if (!result.verified) {
      throw new BadRequestException(
        `Payment not verified. Status: ${result.status}`,
      );
    }

    // Confirm credits if payment is verified
    await this.confirm(paystackReference);
  }

  // ── Get topup history for a company ──────────────────────
  async getHistory(companyId: string) {
    return this.db
      .select()
      .from(creditTopupRequests)
      .where(eq(creditTopupRequests.companyId, companyId))
      .orderBy(creditTopupRequests.createdAt)
      .execute();
  }

  // ── Get pending topups ────────────────────────────────────
  async getPending(companyId: string) {
    return this.db
      .select()
      .from(creditTopupRequests)
      .where(eq(creditTopupRequests.companyId, companyId))
      .execute()
      .then((rows) => rows.filter((r) => r.status === 'pending'));
  }
}
