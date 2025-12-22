// src/company-settings/company-settings.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { allCompanySettings } from './settings';
import type { CompanySettingSeed } from './settings/types';
import { CacheService } from 'src/common/cache/cache.service';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import { db } from 'src/drizzle/types/drizzle';
import { companies, companySettings } from 'src/drizzle/schema';
import { eq, sql, and } from 'drizzle-orm';

@Injectable()
export class CompanySettingsService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly cache: CacheService,
  ) {}

  private readonly coreSettings: CompanySettingSeed[] = allCompanySettings;

  async syncAllCompanySettings(): Promise<string> {
    const allCompanies = await this.db.select().from(companies).execute();

    for (const company of allCompanies) {
      await this.setCoreSettings(company.id);
    }

    return 'ok';
  }

  async setCoreSettings(companyId: string): Promise<void> {
    if (!this.coreSettings.length) return;

    await this.db
      .insert(companySettings)
      .values(
        this.coreSettings.map((setting) => ({
          companyId,
          key: setting.key,
          value: setting.value,
        })),
      )
      .onConflictDoUpdate({
        target: [companySettings.companyId, companySettings.key],
        set: { value: sql`EXCLUDED.value` },
      })
      .execute();

    await this.cache.bumpCompanyVersion(companyId);
  }

  /**
   * Generic setter (reliable):
   * - Upserts the setting
   * - If key starts with payments., also upserts onboarding.payment_setup_complete
   * - Does it all in one DB transaction
   * - Bumps cache version once
   */
  async setSetting(
    companyId: string,
    key: string,
    value: unknown,
  ): Promise<void> {
    const shouldMarkPaymentSetup =
      key.startsWith('payments.') &&
      key !== 'onboarding.payment_setup_complete' &&
      !key.startsWith('onboarding.');

    await this.db.transaction(async (tx) => {
      await tx
        .insert(companySettings)
        .values({ companyId, key, value })
        .onConflictDoUpdate({
          target: [companySettings.companyId, companySettings.key],
          set: { value: sql`EXCLUDED.value` },
        })
        .execute();

      if (shouldMarkPaymentSetup) {
        await tx
          .insert(companySettings)
          .values({
            companyId,
            key: 'onboarding.payment_setup_complete',
            value: true,
          })
          .onConflictDoUpdate({
            target: [companySettings.companyId, companySettings.key],
            set: { value: sql`EXCLUDED.value` },
          })
          .execute();
      }
    });

    await this.cache.bumpCompanyVersion(companyId);
  }

  /**
   * Cached: get all settings by prefix, e.g. "onboarding."
   * Versioned by company, so bumpCompanyVersion invalidates safely.
   */
  async getSettingsByPrefix(companyId: string, prefix: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['company-settings', 'prefix', prefix],
      async () => {
        const rows = await this.db
          .select()
          .from(companySettings)
          .where(
            and(
              eq(companySettings.companyId, companyId),
              sql`${companySettings.key} LIKE ${prefix + '%'}`,
            ),
          )
          .execute();

        return rows.reduce<Record<string, unknown>>((acc, row) => {
          acc[row.key] = row.value;
          return acc;
        }, {});
      },
    );
  }

  /**
   * Cached: get one setting
   */
  async getSetting(companyId: string, key: string) {
    return this.cache.getOrSetVersioned(
      companyId,
      ['company-settings', 'key', key],
      async () => {
        const [row] = await this.db
          .select()
          .from(companySettings)
          .where(
            and(
              eq(companySettings.companyId, companyId),
              eq(companySettings.key, key),
            ),
          )
          .limit(1)
          .execute();

        return row ? row.value : null;
      },
    );
  }

  // -----------------------------
  // 2FA Extractor
  // -----------------------------
  async getTwoFactorAuthSetting(companyId: string) {
    const requiredForAdmins = await this.getSetting(
      companyId,
      'security.two_factor_auth_required_for_admins',
    );

    const optionalForStaff = await this.getSetting(
      companyId,
      'security.two_factor_auth_optional_for_staff',
    );

    return {
      twoFactorAuth: !!requiredForAdmins,
      optionalForStaff: !!optionalForStaff,
    };
  }

  // -----------------------------
  // Onboarding helpers
  // -----------------------------
  async getOnboardingChecklist(companyId: string) {
    const settings = await this.getSettingsByPrefix(companyId, 'onboarding.');

    return {
      branding_setup: !!settings['onboarding.branding_complete'],
      store_setup: !!settings['onboarding.store_setup_complete'],
      location_setup: !!settings['onboarding.location_setup_complete'],
      payment_setup: !!settings['onboarding.payment_setup_complete'],
    };
  }

  async markOnboardingStep(
    companyId: string,
    step:
      | 'store_setup_complete'
      | 'location_setup_complete'
      | 'payment_setup_complete'
      | 'branding_complete',
    value: boolean = true,
  ) {
    const key = `onboarding.${step}`;
    await this.setSetting(companyId, key, value);
  }

  async getGeneralSettings(companyId: string) {
    const settings = await this.getSettingsByPrefix(companyId, 'general.');

    return {
      storefront_url: settings['general.storefront_url'] ?? '',
      support_email: settings['general.support_email'] ?? '',
      support_phone: settings['general.support_phone'] ?? '',
    };
  }

  async getPaymentSettings(companyId: string) {
    const settings = await this.getSettingsByPrefix(companyId, 'payments.');

    return {
      enabled_providers: settings['payments.enabled_providers'] ?? ['paystack'],
      default_provider: settings['payments.default_provider'] ?? 'paystack',
      manual_payment_methods: settings['payments.manual_payment_methods'] ?? [],
      allow_partial_payments:
        settings['payments.allow_partial_payments'] ?? false,
    };
  }

  async getSecuritySettings(companyId: string) {
    const settings = await this.getSettingsByPrefix(companyId, 'security.');

    return {
      two_factor_auth_required_for_admins:
        settings['security.two_factor_auth_required_for_admins'] ?? false,

      two_factor_auth_optional_for_staff:
        settings['security.two_factor_auth_optional_for_staff'] ?? true,

      session_timeout_minutes:
        settings['security.session_timeout_minutes'] ?? 60 * 8,

      allowed_ip_ranges: settings['security.allowed_ip_ranges'] ?? [],

      rate_limit: {
        enabled: settings['security.rate_limit.enabled'] ?? true,
        window_seconds: settings['security.rate_limit.window_seconds'] ?? 60,
        max_requests: settings['security.rate_limit.max_requests'] ?? 120,
      },
    };
  }

  async getTaxSettings(companyId: string) {
    const settings = await this.getSettingsByPrefix(companyId, 'tax.');

    return {
      prices_include_tax: settings['tax.prices_include_tax'] ?? false,
      charge_tax: settings['tax.charge_tax'] ?? true,
      default_country: settings['tax.default_country'] ?? '',
      default_state: settings['tax.default_state'] ?? '',
      rounding_strategy: settings['tax.rounding_strategy'] ?? 'per_line',
      enable_vat: settings['tax.enable_vat'] ?? false,
      vat_default_rate: settings['tax.vat_default_rate'] ?? 0,
    };
  }

  async getCheckoutSettings(companyId: string) {
    const settings = await this.getSettingsByPrefix(companyId, 'checkout.');

    return {
      allow_guest_checkout: settings['checkout.allow_guest_checkout'] ?? true,
      require_phone: settings['checkout.require_phone'] ?? false,
      require_company_name: settings['checkout.require_company_name'] ?? false,
      enable_order_comments: settings['checkout.enable_order_comments'] ?? true,
      auto_capture_payment: settings['checkout.auto_capture_payment'] ?? true,
      currency_mode: settings['checkout.currency_mode'] ?? 'single',
      cart_ttl_minutes: settings['checkout.cart_ttl_minutes'] ?? 60 * 24,
    };
  }
}
