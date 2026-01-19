import { MarkOnboardingStepDto } from './dto/mark-onboarding-step.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CompanySettingsService } from 'src/domains/company-settings/company-settings.service';
export declare class CompanySettingsController extends BaseController {
    private readonly companySettingsService;
    constructor(companySettingsService: CompanySettingsService);
    syncAllCompanyPermissions(): Promise<string>;
    getOnboardingChecklist(user: User): Promise<{
        payment_setup: boolean;
        online_store_customization: boolean;
        shipping_setup: boolean;
        products_added: boolean;
    }>;
    markOnboardingStep(user: User, body: MarkOnboardingStepDto): Promise<{
        success: boolean;
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
