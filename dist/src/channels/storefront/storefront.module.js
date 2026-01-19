"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontModule = void 0;
const common_1 = require("@nestjs/common");
const blog_module_1 = require("./blog/blog.module");
const analytics_module_1 = require("./analytics/analytics.module");
const billing_module_1 = require("./billing/billing.module");
const catalog_module_1 = require("./catalog/catalog.module");
const commerce_module_1 = require("./commerce/commerce.module");
const customers_module_1 = require("./customers/customers.module");
const fulfillment_module_1 = require("./fulfillment/fulfillment.module");
const integration_module_1 = require("./integration/integration.module");
const mail_module_1 = require("./mail/mail.module");
const storefront_config_module_1 = require("./storefront-config/storefront-config.module");
const reviews_module_1 = require("./reviews/reviews.module");
const storefront_global_guard_1 = require("./common/guard/storefront-global.guard");
const payment_module_1 = require("./billing/storefront-payment/payment.module");
let StorefrontModule = class StorefrontModule {
};
exports.StorefrontModule = StorefrontModule;
exports.StorefrontModule = StorefrontModule = __decorate([
    (0, common_1.Module)({
        imports: [
            storefront_global_guard_1.StorefrontGuardsModule,
            analytics_module_1.StorefrontAnalyticsModule,
            billing_module_1.StorefrontBillingModule,
            blog_module_1.StorefrontBlogModule,
            catalog_module_1.StorefrontCatalogModule,
            commerce_module_1.CommerceModule,
            customers_module_1.StorefrontCustomersModule,
            fulfillment_module_1.StorefrontFulfillmentModule,
            integration_module_1.StorefrontIntegrationModule,
            mail_module_1.StorefrontMailModule,
            storefront_config_module_1.StorefrontConfigModule,
            reviews_module_1.StorefrontReviewsModule,
            payment_module_1.StorefrontPaymentModule,
        ],
    })
], StorefrontModule);
//# sourceMappingURL=storefront.module.js.map