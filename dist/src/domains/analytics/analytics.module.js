"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsModule = void 0;
const common_1 = require("@nestjs/common");
const storefront_analytics_service_1 = require("./services/storefront-analytics.service");
const dashboard_analytics_service_1 = require("./services/dashboard-analytics.service");
const dashboard_commerce_analytics_service_1 = require("./services/dashboard-commerce-analytics.service");
const stores_service_1 = require("../commerce/stores/stores.service");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
let AnalyticsModule = class AnalyticsModule {
};
exports.AnalyticsModule = AnalyticsModule;
exports.AnalyticsModule = AnalyticsModule = __decorate([
    (0, common_1.Module)({
        providers: [
            storefront_analytics_service_1.StorefrontAnalyticsService,
            dashboard_analytics_service_1.DashboardAnalyticsService,
            dashboard_commerce_analytics_service_1.DashboardCommerceAnalyticsService,
            stores_service_1.StoresService,
            aws_service_1.AwsService,
        ],
        exports: [
            storefront_analytics_service_1.StorefrontAnalyticsService,
            dashboard_analytics_service_1.DashboardAnalyticsService,
            dashboard_commerce_analytics_service_1.DashboardCommerceAnalyticsService,
        ],
    })
], AnalyticsModule);
//# sourceMappingURL=analytics.module.js.map