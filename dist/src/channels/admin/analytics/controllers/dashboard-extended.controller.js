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
exports.DashboardExtendedAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const dashboard_extended_analytics_service_1 = require("../../../../domains/analytics/services/dashboard-extended-analytics.service");
let DashboardExtendedAnalyticsController = class DashboardExtendedAnalyticsController extends base_controller_1.BaseController {
    constructor(extended) {
        super();
        this.extended = extended;
    }
    resolveArgs(companyId, from, to, storeId, compareMode, compareFrom, compareTo) {
        return {
            companyId,
            storeId: storeId ?? null,
            from: new Date(from),
            to: new Date(to),
            compareMode: (compareMode ?? 'mom'),
            compareTo: compareMode === 'custom' && compareFrom && compareTo
                ? { from: new Date(compareFrom), to: new Date(compareTo) }
                : undefined,
        };
    }
    async salesCards(user, from, to, storeId, compareMode, compareFrom, compareTo) {
        return this.extended.extendedSalesCards(this.resolveArgs(user.companyId, from, to, storeId, compareMode, compareFrom, compareTo));
    }
    async abcClassification(user, from, to, storeId, compareMode, compareFrom, compareTo, limit) {
        return this.extended.abcClassification({
            ...this.resolveArgs(user.companyId, from, to, storeId, compareMode, compareFrom, compareTo),
            limit: Number(limit ?? 100),
        });
    }
    async sellThrough(user, from, to, storeId, compareMode, compareFrom, compareTo, locationId) {
        return this.extended.sellThroughRate({
            ...this.resolveArgs(user.companyId, from, to, storeId, compareMode, compareFrom, compareTo),
            locationId,
        });
    }
    async newVsReturning(user, from, to, storeId, compareMode, compareFrom, compareTo, bucket) {
        return this.extended.newVsReturning({
            ...this.resolveArgs(user.companyId, from, to, storeId, compareMode, compareFrom, compareTo),
            bucket: bucket ?? 'day',
        });
    }
    async fulfillmentStats(user, from, to, storeId, compareMode, compareFrom, compareTo, onTimeThresholdHours) {
        return this.extended.fulfillmentStats({
            ...this.resolveArgs(user.companyId, from, to, storeId, compareMode, compareFrom, compareTo),
            onTimeThresholdHours: Number(onTimeThresholdHours ?? 48),
        });
    }
    async overview(user, from, to, storeId, compareMode, compareFrom, compareTo, bucket, locationId, onTimeThresholdHours, abcLimit) {
        const args = this.resolveArgs(user.companyId, from, to, storeId, compareMode, compareFrom, compareTo);
        const [salesCards, abc, sellThrough, newVsRet, fulfillment] = await Promise.all([
            this.extended.extendedSalesCards(args),
            this.extended.abcClassification({
                ...args,
                limit: Number(abcLimit ?? 100),
            }),
            this.extended.sellThroughRate({ ...args, locationId }),
            this.extended.newVsReturning({ ...args, bucket: bucket ?? 'day' }),
            this.extended.fulfillmentStats({
                ...args,
                onTimeThresholdHours: Number(onTimeThresholdHours ?? 48),
            }),
        ]);
        return {
            salesCards,
            abcClassification: abc,
            sellThrough,
            newVsReturning: newVsRet,
            fulfillment,
            range: {
                from: args.from.toISOString(),
                to: args.to.toISOString(),
                compareMode: args.compareMode,
                comparisonRange: args.compareTo ?? null,
            },
        };
    }
};
exports.DashboardExtendedAnalyticsController = DashboardExtendedAnalyticsController;
__decorate([
    (0, common_1.Get)('admin/sales-cards'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('compareMode')),
    __param(5, (0, common_1.Query)('compareFrom')),
    __param(6, (0, common_1.Query)('compareTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardExtendedAnalyticsController.prototype, "salesCards", null);
__decorate([
    (0, common_1.Get)('admin/abc'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('compareMode')),
    __param(5, (0, common_1.Query)('compareFrom')),
    __param(6, (0, common_1.Query)('compareTo')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardExtendedAnalyticsController.prototype, "abcClassification", null);
__decorate([
    (0, common_1.Get)('admin/sell-through'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('compareMode')),
    __param(5, (0, common_1.Query)('compareFrom')),
    __param(6, (0, common_1.Query)('compareTo')),
    __param(7, (0, common_1.Query)('locationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardExtendedAnalyticsController.prototype, "sellThrough", null);
__decorate([
    (0, common_1.Get)('admin/new-vs-returning'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('compareMode')),
    __param(5, (0, common_1.Query)('compareFrom')),
    __param(6, (0, common_1.Query)('compareTo')),
    __param(7, (0, common_1.Query)('bucket')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardExtendedAnalyticsController.prototype, "newVsReturning", null);
__decorate([
    (0, common_1.Get)('admin/fulfillment'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('compareMode')),
    __param(5, (0, common_1.Query)('compareFrom')),
    __param(6, (0, common_1.Query)('compareTo')),
    __param(7, (0, common_1.Query)('onTimeThresholdHours')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardExtendedAnalyticsController.prototype, "fulfillmentStats", null);
__decorate([
    (0, common_1.Get)('admin/overview'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __param(3, (0, common_1.Query)('storeId')),
    __param(4, (0, common_1.Query)('compareMode')),
    __param(5, (0, common_1.Query)('compareFrom')),
    __param(6, (0, common_1.Query)('compareTo')),
    __param(7, (0, common_1.Query)('bucket')),
    __param(8, (0, common_1.Query)('locationId')),
    __param(9, (0, common_1.Query)('onTimeThresholdHours')),
    __param(10, (0, common_1.Query)('abcLimit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], DashboardExtendedAnalyticsController.prototype, "overview", null);
exports.DashboardExtendedAnalyticsController = DashboardExtendedAnalyticsController = __decorate([
    (0, common_1.Controller)('analytics/extended'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['analytics.read']),
    __metadata("design:paramtypes", [dashboard_extended_analytics_service_1.DashboardExtendedAnalyticsService])
], DashboardExtendedAnalyticsController);
//# sourceMappingURL=dashboard-extended.controller.js.map