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
exports.DashboardAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const dashboard_analytics_service_1 = require("../../../../domains/analytics/services/dashboard-analytics.service");
let DashboardAnalyticsController = class DashboardAnalyticsController extends base_controller_1.BaseController {
    constructor(dash) {
        super();
        this.dash = dash;
    }
    async overview(user, from, to, storeId) {
        const data = await this.dash.overview({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
        });
        return data;
    }
    async topPages(user, from, to, storeId, limit) {
        const data = await this.dash.topPages({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            limit: Number(limit ?? 20),
        });
        return data;
    }
    async landingPages(user, from, to, storeId, limit) {
        const data = await this.dash.landingPages({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            limit: Number(limit ?? 20),
        });
        return data;
    }
    async timeseries(user, from, to, storeId, bucket) {
        const data = await this.dash.timeseries({
            companyId: user.companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            bucket: bucket ?? 'day',
        });
        return data;
    }
};
exports.DashboardAnalyticsController = DashboardAnalyticsController;
__decorate([
    (0, common_1.Get)('overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardAnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('top-pages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardAnalyticsController.prototype, "topPages", null);
__decorate([
    (0, common_1.Get)('landing-pages'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardAnalyticsController.prototype, "landingPages", null);
__decorate([
    (0, common_1.Get)('timeseries'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('bucket')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardAnalyticsController.prototype, "timeseries", null);
exports.DashboardAnalyticsController = DashboardAnalyticsController = __decorate([
    (0, common_1.Controller)('analytics/dashboard'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['analytics.read']),
    __metadata("design:paramtypes", [dashboard_analytics_service_1.DashboardAnalyticsService])
], DashboardAnalyticsController);
//# sourceMappingURL=dashboard-analytics.controller.js.map