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
exports.DashboardCommerceAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const dashboard_commerce_analytics_service_1 = require("../../../../domains/analytics/services/dashboard-commerce-analytics.service");
let DashboardCommerceAnalyticsController = class DashboardCommerceAnalyticsController extends base_controller_1.BaseController {
    constructor(commerce) {
        super();
        this.commerce = commerce;
    }
    async cards(user, from, to, storeId) {
        const data = await this.commerce.cards({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
        });
        return data;
    }
    async salesTimeseries(user, from, to, storeId, bucket) {
        const data = await this.commerce.salesTimeseries({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            bucket: bucket ?? 'day',
        });
        return data;
    }
    async grossSalesCards(user, from, to, storeId) {
        return this.commerce.grossSalesCards({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
        });
    }
    async latestPayments(user, from, to, storeId, limit) {
        return this.commerce.latestPayments({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            limit: Number(limit ?? 10),
        });
    }
    async topProducts(user, from, to, storeId, limit, by) {
        const data = await this.commerce.topSellingProducts({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            limit: Number(limit ?? 10),
            by: by ?? 'revenue',
        });
        return data;
    }
    async recentOrders(user, from, to, storeId, limit, includeUnpaid, orderBy, itemsPerOrder) {
        const data = await this.commerce.recentOrders({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            limit: Number(limit ?? 5),
            orderBy: orderBy ?? 'createdAt',
            itemsPerOrder: Number(itemsPerOrder ?? 3),
        });
        return data;
    }
    async ordersByChannel(user, from, to, storeId, metric) {
        return this.commerce.ordersByChannelPie({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            metric: metric ?? 'orders',
        });
    }
    async overview(user, from, to, storeId, topProductsLimit, recentOrdersLimit, paymentsLimit, topProductsBy) {
        return this.commerce.overview({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            topProductsLimit: Number(topProductsLimit ?? 5),
            recentOrdersLimit: Number(recentOrdersLimit ?? 5),
            paymentsLimit: Number(paymentsLimit ?? 5),
            topProductsBy: topProductsBy ?? 'revenue',
        });
    }
};
exports.DashboardCommerceAnalyticsController = DashboardCommerceAnalyticsController;
__decorate([
    (0, common_1.Get)('admin/cards'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "cards", null);
__decorate([
    (0, common_1.Get)('admin/sales-timeseries'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('bucket')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "salesTimeseries", null);
__decorate([
    (0, common_1.Get)('admin/gross-sales-cards'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "grossSalesCards", null);
__decorate([
    (0, common_1.Get)('admin/latest-payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "latestPayments", null);
__decorate([
    (0, common_1.Get)('admin/top-products'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('by')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "topProducts", null);
__decorate([
    (0, common_1.Get)('admin/recent-orders'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('includeUnpaid')),
    __param(6, (0, common_1.Query)('orderBy')),
    __param(7, (0, common_1.Query)('itemsPerOrder')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "recentOrders", null);
__decorate([
    (0, common_1.Get)('admin/orders-by-channel'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('metric')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "ordersByChannel", null);
__decorate([
    (0, common_1.Get)('admin/overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('topProductsLimit')),
    __param(5, (0, common_1.Query)('recentOrdersLimit')),
    __param(6, (0, common_1.Query)('paymentsLimit')),
    __param(7, (0, common_1.Query)('topProductsBy')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardCommerceAnalyticsController.prototype, "overview", null);
exports.DashboardCommerceAnalyticsController = DashboardCommerceAnalyticsController = __decorate([
    (0, common_1.Controller)('analytics/commerce'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['analytics.read']),
    __metadata("design:paramtypes", [dashboard_commerce_analytics_service_1.DashboardCommerceAnalyticsService])
], DashboardCommerceAnalyticsController);
//# sourceMappingURL=dashboard-commerce-analytics.controller.js.map