"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySettingsService = void 0;
const common_1 = require("@nestjs/common");
const settings_1 = require("./settings");
const cache_service_1 = require("../../infrastructure/cache/cache.service");
const drizzle_module_1 = require("../../infrastructure/drizzle/drizzle.module");
const schema_1 = require("../../infrastructure/drizzle/schema");
const drizzle_orm_1 = require("drizzle-orm");
let CompanySettingsService = class CompanySettingsService {
    constructor(db, cache) {
        this.db = db;
        this.cache = cache;
        this.coreSettings = settings_1.allCompanySettings;
    }
    async syncAllCompanySettings() {
        const allCompanies = await this.db.select().from(schema_1.companies).execute();
        for (const company of allCompanies) {
            await this.setCoreSettings(company.id);
        }
        return 'ok';
    }
    async setCoreSettings(companyId) {
        if (!this.coreSettings.length)
            return;
        await this.db
            .insert(schema_1.companySettings)
            .values(this.coreSettings.map((setting) => ({
            companyId,
            key: setting.key,
            value: setting.value,
        })))
            .onConflictDoUpdate({
            target: [schema_1.companySettings.companyId, schema_1.companySettings.key],
            set: { value: (0, drizzle_orm_1.sql) `EXCLUDED.value` },
        })
            .execute();
        await this.cache.bumpCompanyVersion(companyId);
    }
    async setSetting(companyId, key, value) {
        const shouldMarkPaymentSetup = key.startsWith('payments.') &&
            key !== 'onboarding.payment_setup_complete' &&
            !key.startsWith('onboarding.');
        await this.db.transaction(async (tx) => {
            await tx
                .insert(schema_1.companySettings)
                .values({ companyId, key, value })
                .onConflictDoUpdate({
                target: [schema_1.companySettings.companyId, schema_1.companySettings.key],
                set: { value: (0, drizzle_orm_1.sql) `EXCLUDED.value` },
            })
                .execute();
            if (shouldMarkPaymentSetup) {
                await tx
                    .insert(schema_1.companySettings)
                    .values({
                    companyId,
                    key: 'onboarding.payment_setup_complete',
                    value: true,
                })
                    .onConflictDoUpdate({
                    target: [schema_1.companySettings.companyId, schema_1.companySettings.key],
                    set: { value: (0, drizzle_orm_1.sql) `EXCLUDED.value` },
                })
                    .execute();
            }
        });
        await this.cache.bumpCompanyVersion(companyId);
    }
    async getSettingsByPrefix(companyId, prefix) {
        return this.cache.getOrSetVersioned(companyId, ['company-settings', 'prefix', prefix], async () => {
            const rows = await this.db
                .select()
                .from(schema_1.companySettings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.sql) `${schema_1.companySettings.key} LIKE ${prefix + '%'}`))
                .execute();
            return rows.reduce((acc, row) => {
                acc[row.key] = row.value;
                return acc;
            }, {});
        });
    }
    async getSetting(companyId, key) {
        return this.cache.getOrSetVersioned(companyId, ['company-settings', 'key', key], async () => {
            const [row] = await this.db
                .select()
                .from(schema_1.companySettings)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.companySettings.companyId, companyId), (0, drizzle_orm_1.eq)(schema_1.companySettings.key, key)))
                .limit(1)
                .execute();
            return row ? row.value : null;
        });
    }
    async getTwoFactorAuthSetting(companyId) {
        const requiredForAdmins = await this.getSetting(companyId, 'security.two_factor_auth_required_for_admins');
        const optionalForStaff = await this.getSetting(companyId, 'security.two_factor_auth_optional_for_staff');
        return {
            twoFactorAuth: !!requiredForAdmins,
            optionalForStaff: !!optionalForStaff,
        };
    }
    async getOnboardingChecklist(companyId) {
        const settings = await this.getSettingsByPrefix(companyId, 'onboarding.');
        return {
            payment_setup: !!settings['onboarding.payment_setup_complete'],
            online_store_customization: !!settings['onboarding.online_store_customization_complete'],
            shipping_setup: !!settings['onboarding.shipping_setup_complete'],
            products_added: !!settings['onboarding.products_added_complete'],
        };
    }
    async getOnboardingOptionalChecklist(companyId) {
        const settings = await this.getSettingsByPrefix(companyId, 'onboarding.');
        return {
            checkout_review: !!settings['onboarding.checkout_review_complete'],
            tax_review: !!settings['onboarding.tax_review_complete'],
            team_invite: !!settings['onboarding.team_invite_complete'],
        };
    }
    async markOnboardingStep(companyId, step, value = true) {
        const key = `onboarding.${step}`;
        await this.setSetting(companyId, key, value);
    }
    async getPaymentSettings(companyId) {
        const settings = await this.getSettingsByPrefix(companyId, 'payments.');
        return {
            enabled_providers: settings['payments.enabled_providers'] ?? ['paystack'],
            default_provider: settings['payments.default_provider'] ?? 'paystack',
            manual_payment_methods: settings['payments.manual_payment_methods'] ?? [],
            allow_partial_payments: settings['payments.allow_partial_payments'] ?? false,
        };
    }
    async getSecuritySettings(companyId) {
        const settings = await this.getSettingsByPrefix(companyId, 'security.');
        return {
            two_factor_auth_required_for_admins: settings['security.two_factor_auth_required_for_admins'] ?? false,
            two_factor_auth_optional_for_staff: settings['security.two_factor_auth_optional_for_staff'] ?? true,
            session_timeout_minutes: settings['security.session_timeout_minutes'] ?? 60 * 8,
            allowed_ip_ranges: settings['security.allowed_ip_ranges'] ?? [],
            rate_limit: {
                enabled: settings['security.rate_limit.enabled'] ?? true,
                window_seconds: settings['security.rate_limit.window_seconds'] ?? 60,
                max_requests: settings['security.rate_limit.max_requests'] ?? 120,
            },
        };
    }
    async getCheckoutSettings(companyId) {
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
};
exports.CompanySettingsService = CompanySettingsService;
exports.CompanySettingsService = CompanySettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [Object, cache_service_1.CacheService])
], CompanySettingsService);
//# sourceMappingURL=company-settings.service.js.map