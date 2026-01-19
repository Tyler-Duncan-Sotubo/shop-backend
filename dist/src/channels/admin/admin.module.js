"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
const auth_module_1 = require("./auth/auth.module");
const billing_module_1 = require("./billing/billing.module");
const blog_module_1 = require("./blog/blog.module");
const audit_module_1 = require("./audit/audit.module");
const catalog_module_1 = require("./catalog/catalog.module");
const commerce_module_1 = require("./commerce/commerce.module");
const companies_module_1 = require("./companies/companies.module");
const company_settings_module_1 = require("./company-settings/company-settings.module");
const customers_module_1 = require("./customers/customers.module");
const fulfillment_module_1 = require("./fulfillment/fulfillment.module");
const iam_module_1 = require("./iam/iam.module");
const integration_module_1 = require("./integration/integration.module");
const mail_module_1 = require("./mail/mail.module");
const media_module_1 = require("./media/media.module");
const setup_module_1 = require("./setup/setup.module");
const storefront_config_module_1 = require("./storefront-config/storefront-config.module");
const reviews_module_1 = require("./reviews/reviews.module");
const guards_module_1 = require("./common/guards/guards.module");
const analytics_module_1 = require("./analytics/analytics.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            guards_module_1.GuardsModule,
            analytics_module_1.AdminAnalyticsModule,
            company_settings_module_1.AdminCompanySettingsModule,
            customers_module_1.AdminCustomersModule,
            audit_module_1.AdminAuditModule,
            auth_module_1.AdminAuthModule,
            billing_module_1.BillingModule,
            blog_module_1.AdminBlogModule,
            catalog_module_1.AdminCatalogModule,
            commerce_module_1.AdminCommerceModule,
            companies_module_1.AdminCompaniesModule,
            fulfillment_module_1.FulfillmentModule,
            iam_module_1.AdminIamModule,
            integration_module_1.AdminIntegrationModule,
            mail_module_1.AdminMailModule,
            media_module_1.AdminMediaModule,
            setup_module_1.AdminSetupModule,
            storefront_config_module_1.AdminStorefrontConfigModule,
            reviews_module_1.AdminReviewsModule,
        ],
        providers: [aws_service_1.AwsService],
        exports: [aws_service_1.AwsService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map