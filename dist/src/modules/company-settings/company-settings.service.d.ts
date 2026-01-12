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
        payment_setup: boolean;
        online_store_customization: boolean;
        shipping_setup: boolean;
        products_added: boolean;
    }>;
    getOnboardingOptionalChecklist(companyId: string): Promise<{
        checkout_review: boolean;
        tax_review: boolean;
        team_invite: boolean;
    }>;
    markOnboardingStep(companyId: string, step: 'payment_setup_complete' | 'online_store_customization_complete' | 'shipping_setup_complete' | 'products_added_complete' | 'checkout_review_complete' | 'tax_review_complete' | 'team_invite_complete', value?: boolean): Promise<void>;
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
