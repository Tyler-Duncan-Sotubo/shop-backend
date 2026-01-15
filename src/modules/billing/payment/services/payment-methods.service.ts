import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db as DbType } from 'src/drizzle/types/drizzle';
import { paymentMethods, stores } from 'src/drizzle/schema';
import {
  PaymentMethodType,
  ToggleStorePaymentMethodDto,
  UpsertBankTransferConfigDto,
  UpsertGatewayConfigDto,
} from '../dto/payment-methods.dto';
import { CompanySettingsService } from 'src/modules/company-settings/company-settings.service';

@Injectable()
export class PaymentMethodsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DbType,
    private readonly companySettings: CompanySettingsService,
  ) {}

  private assertGatewayProvider(dto: {
    method: PaymentMethodType;
    provider?: any;
  }) {
    if (dto.method === PaymentMethodType.gateway && !dto.provider) {
      throw new BadRequestException('provider is required when method=gateway');
    }
  }

  async listStoreMethods(companyId: string, storeId: string) {
    // validate store scope
    const [st] = await this.db
      .select({ id: stores.id })
      .from(stores)
      .where(and(eq(stores.companyId, companyId), eq(stores.id, storeId)))
      .execute();

    if (!st) throw new NotFoundException('Store not found');

    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.storeId, storeId),
        ),
      )
      .execute();

    return rows;
  }

  /**
   * Storefront-safe: returns only what's needed at checkout (no secrets).
   */
  async getCheckoutMethods(companyId: string, storeId: string) {
    const rows = await this.listStoreMethods(companyId, storeId);

    const gateway = rows
      .filter((r: any) => r.method === 'gateway' && r.enabled)
      .map((r: any) => ({
        method: 'gateway',
        provider: r.provider,
        // return only non-sensitive info
        publicConfig: this.pickPublicGatewayConfig(r.provider, r.config),
      }));

    const bankTransfer = rows.find((r: any) => r.method === 'bank_transfer');

    return {
      storeId,
      methods: [
        ...gateway,
        ...(bankTransfer?.isEnabled
          ? [
              {
                method: 'bank_transfer',
                bankDetails: (bankTransfer.config as any)?.bankDetails ?? null,
              },
            ]
          : []),
      ],
    };
  }

  private pickPublicGatewayConfig(provider: string, config: any) {
    if (!config) return null;
    if (provider === 'paystack') {
      // never return secret keys to storefront
      return {
        publicKey: config.publicKey ?? null,
        channels: config.channels ?? null,
      };
    }
    if (provider === 'stripe') {
      return {
        publishableKey: config.publishableKey ?? null,
      };
    }
    return null;
  }

  async toggle(companyId: string, dto: ToggleStorePaymentMethodDto) {
    this.assertGatewayProvider(dto);

    const provider =
      dto.method === PaymentMethodType.gateway ? dto.provider! : null;

    // upsert toggle row (keep config intact)
    const existing = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.storeId, dto.storeId),
          eq(paymentMethods.method, dto.method as any),
          provider
            ? eq(paymentMethods.provider, provider as any)
            : (sql`${paymentMethods.provider} IS NULL` as any),
        ),
      )
      .limit(1)
      .execute();

    if (existing?.[0]) {
      const [updated] = await this.db
        .update(paymentMethods)
        .set({
          isEnabled: dto.enabled,
          status: dto.enabled === true ? 'connected' : 'disconnected',
          updatedAt: new Date(),
        } as any)
        .where(eq(paymentMethods.id, existing[0].id))
        .returning()
        .execute();

      return updated;
    }

    const [created] = await this.db
      .insert(paymentMethods)
      .values({
        companyId,
        storeId: dto.storeId,
        method: dto.method as any,
        provider: provider as any,
        isEnabled: dto.enabled,
        status: dto.enabled === true ? 'connected' : 'disconnected',
        config: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    return created;
  }

  async upsertGateway(companyId: string, dto: UpsertGatewayConfigDto) {
    const method = PaymentMethodType.gateway;

    // read existing
    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.storeId, dto.storeId),
          eq(paymentMethods.method, method as any),
          eq(paymentMethods.provider, dto.provider as any),
        ),
      )
      .limit(1)
      .execute();

    const existing = rows?.[0] ?? null;

    const nextConfig = dto.config ?? (existing?.config as any) ?? null;

    if (existing) {
      const [updated] = await this.db
        .update(paymentMethods)
        .set({
          isEnabled: dto.enabled,
          status: dto.enabled === true ? 'connected' : 'disconnected',
          config: nextConfig,
          updatedAt: new Date(),
        } as any)
        .where(eq(paymentMethods.id, existing.id))
        .returning()
        .execute();

      return updated;
    }

    const [created] = await this.db
      .insert(paymentMethods)
      .values({
        companyId,
        storeId: dto.storeId,
        method: method as any,
        provider: dto.provider as any,
        isEnabled: dto.enabled,
        config: nextConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    await this.companySettings.markOnboardingStep(
      companyId,
      'payment_setup_complete',
      true,
    );

    return created;
  }

  async upsertBankTransfer(
    companyId: string,
    dto: UpsertBankTransferConfigDto,
  ) {
    const method = PaymentMethodType.bank_transfer;

    const rows = await this.db
      .select()
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.storeId, dto.storeId),
          eq(paymentMethods.method, method as any),
          sql`${paymentMethods.provider} IS NULL` as any,
        ),
      )
      .limit(1)
      .execute();

    const existing = rows?.[0] ?? null;

    const nextConfig = {
      bankDetails: dto.bankDetails,
    };

    if (existing) {
      const [updated] = await this.db
        .update(paymentMethods)
        .set({
          isEnabled: dto.enabled,
          config: nextConfig,
          updatedAt: new Date(),
        } as any)
        .where(eq(paymentMethods.id, existing.id))
        .returning()
        .execute();

      return updated;
    }

    const [created] = await this.db
      .insert(paymentMethods)
      .values({
        companyId,
        storeId: dto.storeId,
        method: method as any,
        provider: null,
        enabled: dto.enabled,
        config: nextConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .returning()
      .execute();

    await this.companySettings.markOnboardingStep(
      companyId,
      'payment_setup_complete',
      true,
    );

    return created;
  }
}
