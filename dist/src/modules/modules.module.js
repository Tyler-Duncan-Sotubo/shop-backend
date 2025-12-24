"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModulesModule = void 0;
const common_1 = require("@nestjs/common");
const audit_module_1 = require("./audit/audit.module");
const auth_module_1 = require("./auth/auth.module");
const drizzle_module_1 = require("../drizzle/drizzle.module");
const cache_module_1 = require("../common/cache/cache.module");
const export_clean_service_1 = require("../common/services/export-clean.service");
const companies_module_1 = require("./companies/companies.module");
const company_settings_module_1 = require("./company-settings/company-settings.module");
const iam_module_1 = require("./iam/iam.module");
const notification_module_1 = require("./notification/notification.module");
const customers_module_1 = require("./customers/customers.module");
const stores_module_1 = require("./commerce/stores/stores.module");
const inventory_module_1 = require("./commerce/inventory/inventory.module");
const catalog_module_1 = require("./catalog/catalog.module");
const cart_module_1 = require("./commerce/cart/cart.module");
const shipping_module_1 = require("./fulfillment/shipping/shipping.module");
const orders_module_1 = require("./commerce/orders/orders.module");
const checkout_module_1 = require("./commerce/checkout/checkout.module");
const reviews_module_1 = require("./reviews/reviews.module");
const pickup_module_1 = require("./fulfillment/pickup/pickup.module");
const billing_module_1 = require("./billing/billing.module");
const blog_module_1 = require("./blog/blog.module");
const media_module_1 = require("./media/media.module");
let ModulesModule = class ModulesModule {
};
exports.ModulesModule = ModulesModule;
exports.ModulesModule = ModulesModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [export_clean_service_1.ExportCleanupService],
        imports: [
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            drizzle_module_1.DrizzleModule,
            company_settings_module_1.CompanySettingsModule,
            cache_module_1.CacheModule,
            companies_module_1.CompaniesModule,
            iam_module_1.IamModule,
            notification_module_1.NotificationModule,
            customers_module_1.CustomersModule,
            stores_module_1.StoresModule,
            inventory_module_1.InventoryModule,
            catalog_module_1.CatalogModule,
            cart_module_1.CartModule,
            shipping_module_1.ShippingModule,
            orders_module_1.OrdersModule,
            checkout_module_1.CheckoutModule,
            reviews_module_1.ReviewsModule,
            pickup_module_1.PickupModule,
            billing_module_1.BillingModule,
            blog_module_1.BlogModule,
            media_module_1.MediaModule,
        ],
        exports: [
            audit_module_1.AuditModule,
            auth_module_1.AuthModule,
            drizzle_module_1.DrizzleModule,
            company_settings_module_1.CompanySettingsModule,
            cache_module_1.CacheModule,
            companies_module_1.CompaniesModule,
            iam_module_1.IamModule,
            notification_module_1.NotificationModule,
        ],
    })
], ModulesModule);
//# sourceMappingURL=modules.module.js.map