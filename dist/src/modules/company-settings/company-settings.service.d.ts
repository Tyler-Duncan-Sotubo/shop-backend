import { CacheService } from 'src/common/cache/cache.service';
import { db } from 'src/drizzle/types/drizzle';
export declare class CompanySettingsService {
    private db;
    private readonly cache;
    constructor(db: db, cache: CacheService);
    private readonly coreSettings;
    syncAllCompanySettings(): Promise<string>;
    setCoreSettings(companyId: string): Promise<void>;
    setSetting(companyId: string, key: string, value: unknown): Promise<void>;
    getSettingsByPrefix(companyId: string, prefix: string): Promise<Record<string, unknown>>;
    getSetting(companyId: string, key: string): Promise<unknown>;
    getTwoFactorAuthSetting(companyId: string): Promise<{
        twoFactorAuth: boolean;
        optionalForStaff: boolean;
    }>;
    getOnboardingChecklist(companyId: string): Promise<{
        branding_setup: boolean;
        store_setup: boolean;
        location_setup: boolean;
        payment_setup: boolean;
    }>;
    markOnboardingStep(companyId: string, step: 'store_setup_complete' | 'location_setup_complete' | 'payment_setup_complete' | 'branding_complete', value?: boolean): Promise<void>;
    getGeneralSettings(companyId: string): Promise<{
        storefront_url: {};
        support_email: {};
        support_phone: {};
    }>;
    getPaymentSettings(companyId: string): Promise<{
        enabled_providers: {};
        default_provider: {};
        manual_payment_methods: {};
        allow_partial_payments: {};
    }>;
    getSecuritySettings(companyId: string): Promise<{
        two_factor_auth_required_for_admins: {};
        two_factor_auth_optional_for_staff: {};
        session_timeout_minutes: {};
        allowed_ip_ranges: {};
        rate_limit: {
            enabled: {};
            window_seconds: {};
            max_requests: {};
        };
    }>;
    getTaxSettings(companyId: string): Promise<{
        prices_include_tax: {};
        charge_tax: {};
        default_country: {};
        default_state: {};
        rounding_strategy: {};
        enable_vat: {};
        vat_default_rate: {};
    }>;
    getCheckoutSettings(companyId: string): Promise<{
        allow_guest_checkout: {};
        require_phone: {};
        require_company_name: {};
        enable_order_comments: {};
        auto_capture_payment: {};
        currency_mode: {};
        cart_ttl_minutes: {};
    }>;
}
