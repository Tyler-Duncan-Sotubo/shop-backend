// src/domains/subscriptions/services/billing-paystack.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

const BASE_URL = 'https://api.paystack.co';

type InitializeBillingInput = {
  email: string;
  amountNGN: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
};

@Injectable()
export class BillingPaystackService {
  private readonly logger = new Logger(BillingPaystackService.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  // ── Read key at call time via ConfigService ───────────────
  private get secretKey(): string {
    const key = this.config.get<string>('PAYSTACK_BILLING_SECRET_KEY');
    if (!key) {
      throw new BadRequestException(
        'PAYSTACK_BILLING_SECRET_KEY is not configured',
      );
    }
    return key;
  }

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  private toKobo(amountNGN: number): number {
    if (!Number.isFinite(amountNGN) || amountNGN <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    return Math.round(amountNGN * 100);
  }

  // ── Initialize transaction ────────────────────────────────
  async initializeTransaction(input: InitializeBillingInput) {
    const payload = {
      email: input.email,
      amount: this.toKobo(input.amountNGN),
      currency: 'NGN',
      reference: input.reference,
      callback_url:
        input.callbackUrl ?? `${this.frontendUrl}/billing?topup=success`,
      metadata: input.metadata ?? undefined,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(`${BASE_URL}/transaction/initialize`, payload, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const body = response.data;

      if (!body?.status) {
        throw new BadRequestException(
          body?.message ?? 'Failed to initialize Paystack transaction',
        );
      }

      return {
        status: body.status,
        message: body.message,
        data: {
          authorizationUrl: body.data?.authorization_url ?? null,
          accessCode: body.data?.access_code ?? null,
          reference: body.data?.reference ?? input.reference,
        },
      };
    } catch (error: any) {
      this.logger.error('Paystack billing initialize failed', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });

      throw new BadRequestException(
        error?.response?.data?.message ??
          'Failed to initialize billing payment',
      );
    }
  }

  // ── Verify transaction ────────────────────────────────────
  async verifyTransaction(reference: string) {
    if (!reference) {
      throw new BadRequestException('Reference is required');
    }

    try {
      const response = await firstValueFrom(
        this.http.get(`${BASE_URL}/transaction/verify/${reference}`, {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }),
      );

      const body = response.data;

      if (!body?.status) {
        throw new BadRequestException(
          body?.message ?? 'Failed to verify Paystack transaction',
        );
      }

      const data = body.data;

      return {
        verified: data?.status === 'success',
        reference: data?.reference ?? reference,
        status: data?.status ?? null,
        amountNGN: typeof data?.amount === 'number' ? data.amount / 100 : null,
        currency: data?.currency ?? null,
        paidAt: data?.paid_at ?? null,
        channel: data?.channel ?? null,
        gatewayResponse: data?.gateway_response ?? null,
        customer: data?.customer ?? null,
        metadata: data?.metadata ?? null,
        raw: data,
      };
    } catch (error: any) {
      this.logger.error('Paystack billing verify failed', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });

      throw new BadRequestException(
        error?.response?.data?.message ?? 'Failed to verify billing payment',
      );
    }
  }

  // ── Validate webhook signature ────────────────────────────
  validateWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
  ): boolean {
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }

  // ── Process webhook ───────────────────────────────────────
  processWebhook(rawBody: Buffer | string, signature: string) {
    const isValid = this.validateWebhookSignature(rawBody, signature);

    if (!isValid) {
      throw new BadRequestException(
        'Invalid Paystack billing webhook signature',
      );
    }

    const event =
      typeof rawBody === 'string'
        ? JSON.parse(rawBody)
        : JSON.parse(rawBody.toString('utf8'));

    return {
      valid: true,
      event: event?.event ?? null,
      reference: event?.data?.reference ?? null,
      status: event?.data?.status ?? null,
      amountNGN:
        typeof event?.data?.amount === 'number'
          ? event.data.amount / 100
          : null,
      currency: event?.data?.currency ?? null,
      metadata: event?.data?.metadata ?? null,
      raw: event,
    };
  }

  // ── Create Paystack plan ──────────────────────────────────
  async createPlan(input: {
    name: string;
    amountNGN: number;
    interval: 'monthly' | 'annually';
  }) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${BASE_URL}/plan`,
          {
            name: input.name,
            amount: this.toKobo(input.amountNGN),
            interval: input.interval,
            currency: 'NGN',
          },
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const body = response.data;

      if (!body?.status) {
        throw new BadRequestException(
          body?.message ?? 'Failed to create Paystack plan',
        );
      }

      return {
        planCode: body.data?.plan_code ?? null,
        name: body.data?.name ?? null,
        amount: body.data?.amount ?? null,
        interval: body.data?.interval ?? null,
      };
    } catch (error: any) {
      this.logger.error('Paystack create plan failed', error?.response?.data);
      throw new BadRequestException(
        error?.response?.data?.message ?? 'Failed to create Paystack plan',
      );
    }
  }

  // ── Cancel Paystack subscription ──────────────────────────
  async cancelSubscription(subscriptionCode: string, emailToken: string) {
    try {
      const response = await firstValueFrom(
        this.http.post(
          `${BASE_URL}/subscription/disable`,
          {
            code: subscriptionCode,
            token: emailToken,
          },
          {
            headers: {
              Authorization: `Bearer ${this.secretKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const body = response.data;

      if (!body?.status) {
        throw new BadRequestException(
          body?.message ?? 'Failed to cancel Paystack subscription',
        );
      }

      return { success: true, message: body.message };
    } catch (error: any) {
      this.logger.error(
        'Paystack cancel subscription failed',
        error?.response?.data,
      );
      throw new BadRequestException(
        error?.response?.data?.message ??
          'Failed to cancel Paystack subscription',
      );
    }
  }
}
