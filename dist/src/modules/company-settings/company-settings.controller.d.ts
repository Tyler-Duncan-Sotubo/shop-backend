import { CompanySettingsService } from './company-settings.service';
import { MarkOnboardingStepDto } from './dto/mark-onboarding-step.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class CompanySettingsController extends BaseController {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    syncAllCompanyPermissions(): Promise<string>;
    getOnboardingChecklist(user: User): Promise<{
        branding_setup: boolean;
        store_setup: boolean;
        location_setup: boolean;
        payment_setup: boolean;
    }>;
    markOnboardingStep(user: User, body: MarkOnboardingStepDto): Promise<{
        success: boolean;
    }>;
    getGeneralSettings(user: User): Promise<{
        storefront_url: {};
        support_email: {};
        support_phone: {};
    }>;
    getPaymentSettings(user: User): Promise<{
        enabled_providers: {};
        default_provider: {};
        manual_payment_methods: {};
        allow_partial_payments: {};
    }>;
    getSecuritySettings(user: User): Promise<{
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
    getTaxSettings(user: User): Promise<{
        prices_include_tax: {};
        charge_tax: {};
        default_country: {};
        default_state: {};
        rounding_strategy: {};
        enable_vat: {};
        vat_default_rate: {};
    }>;
    getCheckoutSettings(user: User): Promise<{
        allow_guest_checkout: {};
        require_phone: {};
        require_company_name: {};
        enable_order_comments: {};
        auto_capture_payment: {};
        currency_mode: {};
        cart_ttl_minutes: {};
    }>;
    updateSetting(user: User, body: {
        key: string;
        value: string;
    }): Promise<void>;
}
