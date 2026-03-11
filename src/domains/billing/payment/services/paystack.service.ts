import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { and, eq } from 'drizzle-orm';
import * as crypto from 'crypto';

import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db as DbType } from 'src/infrastructure/drizzle/types/drizzle';
import { orders, paymentMethods } from 'src/infrastructure/drizzle/schema';
import { OrdersService } from 'src/domains/commerce/orders/orders.service';
import { PaymentService } from './payment.service';

type PaystackConfig = {
  publicKey?: string | null;
  secretKey?: string | null;
  channels?: string[] | null;
  callbackUrl?: string | null;
};

type InitializePaystackInput = {
  companyId: string;
  storeId: string;
  email: string;
  amount: number; // major unit, e.g. 5000 NGN
  currency?: string; // default NGN
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
  channels?: string[];
};

@Injectable()
export class PaystackService {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly http: HttpService,
    private readonly order: OrdersService,
    private readonly payment: PaymentService,
  ) {}

  private async getStorePaystackMethod(companyId: string, storeId: string) {
    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.storeId, storeId),
          eq(paymentMethods.method, 'gateway'),
          eq(paymentMethods.provider, 'paystack'),
        ),
      )
      .limit(1)
      .execute();

    const row = rows?.[0];
    if (!row) {
      throw new NotFoundException('Paystack is not configured for this store');
    }

    if (!row.isEnabled) {
      throw new BadRequestException('Paystack is disabled for this store');
    }
    return row;
  }

  private async getSecretKey(companyId: string, storeId: string) {
    const method = await this.getStorePaystackMethod(companyId, storeId);
    const config = (method.config ?? {}) as PaystackConfig;

    if (!config.secretKey) {
      throw new BadRequestException(
        'Paystack secret key is missing for this store',
      );
    }

    return {
      method,
      config,
      secretKey: config.secretKey,
    };
  }

  private toSubunit(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Paystack expects amount in the lowest currency unit
    return Math.round(amount * 100);
  }

  async getPublicCheckoutConfig(companyId: string, storeId: string) {
    const method = await this.getStorePaystackMethod(companyId, storeId);
    const config = (method.config ?? {}) as PaystackConfig;

    return {
      provider: 'paystack',
      publicKey: config.publicKey ?? null,
      channels: config.channels ?? null,
      callbackUrl: config.callbackUrl ?? null,
    };
  }

  async initializeTransaction(input: InitializePaystackInput) {
    const { config, secretKey } = await this.getSecretKey(
      input.companyId,
      input.storeId,
    );

    const payload = {
      email: input.email,
      amount: this.toSubunit(input.amount),
      currency: input.currency ?? 'NGN',
      reference: input.reference,
      callback_url: input.callbackUrl ?? config.callbackUrl ?? undefined,
      metadata: input.metadata ?? undefined,
      channels: input.channels ?? config.channels ?? undefined,
    };

    try {
      const response = await firstValueFrom(
        this.http.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
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
      console.error('Paystack initialize failed:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });

      throw new BadRequestException(
        error?.response?.data?.message ??
          'Failed to initialize Paystack transaction',
      );
    }
  }

  async verifyTransaction(
    companyId: string,
    storeId: string,
    reference: string,
  ) {
    if (!reference) {
      throw new BadRequestException('reference is required');
    }

    const { secretKey } = await this.getSecretKey(companyId, storeId);

    const response = await firstValueFrom(
      this.http.get(`${this.baseUrl}/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${secretKey}`,
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
      provider: 'paystack',
      verified: data?.status === 'success',
      reference: data?.reference ?? reference,
      status: data?.status ?? null,
      amount: typeof data?.amount === 'number' ? data.amount / 100 : null,
      currency: data?.currency ?? null,
      paidAt: data?.paid_at ?? null,
      channel: data?.channel ?? null,
      gatewayResponse: data?.gateway_response ?? null,
      customer: data?.customer ?? null,
      authorization: data?.authorization ?? null,
      raw: data,
    };
  }

  async verifyAndSyncOrder(
    companyId: string,
    storeId: string,
    reference: string,
  ) {
    const result = await this.verifyTransaction(companyId, storeId, reference);

    const orderId = result.raw?.metadata?.orderId ?? null;

    if (!orderId && !result.reference) {
      throw new BadRequestException('Unable to resolve order from payment');
    }

    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.companyId, companyId), eq(orders.id, orderId)))
      .execute();

    if (!order) {
      throw new NotFoundException('Order not found for this payment');
    }

    if (result.verified) {
      await this.payment.finalizeGatewayPaymentForOrder({
        companyId,
        storeId,
        orderId: (order.id as string) ?? null,
        provider: 'paystack',
        providerRef: result.reference,
        providerEventId: null,
        amountMinor: Math.round(Number(result.amount ?? 0) * 100),
        currency: 'NGN',
        paidAt: result.paidAt ?? null,
        meta: {
          gatewayResponse: result.gatewayResponse ?? null,
          channel: result.channel ?? null,
          authorization: result.authorization ?? null,
          customer: result.customer ?? null,
          raw: result.raw ?? null,
        },
        confirmedByUserId: null,
      });
    }

    return {
      ...result,
      orderId: order.id,
    };
  }

  validateWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
    secretKey: string,
  ) {
    if (!signature) return false;

    const hash = crypto
      .createHmac('sha512', secretKey)
      .update(rawBody)
      .digest('hex');

    return hash === signature;
  }

  async processWebhook(
    companyId: string,
    storeId: string,
    rawBody: Buffer | string,
    signature: string,
  ) {
    const { secretKey } = await this.getSecretKey(companyId, storeId);

    const isValid = this.validateWebhookSignature(
      rawBody,
      signature,
      secretKey,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid Paystack webhook signature');
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
      amount:
        typeof event?.data?.amount === 'number'
          ? event.data.amount / 100
          : null,
      currency: event?.data?.currency ?? null,
      raw: event,
    };
  }
}
