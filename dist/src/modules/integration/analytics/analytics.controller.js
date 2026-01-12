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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const analytics_service_1 = require("./analytics.service");
const create_analytics_dto_1 = require("./dto/create-analytics.dto");
const update_analytics_dto_1 = require("./dto/update-analytics.dto");
const set_enabled_dto_1 = require("./dto/set-enabled.dto");
const current_company_id_decorator_1 = require("../../storefront-config/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../storefront-config/decorators/current-store.decorator");
const storefront_guard_1 = require("../../storefront-config/guard/storefront.guard");
let AnalyticsController = class AnalyticsController extends base_controller_1.BaseController {
    constructor(analyticsService) {
        super();
        this.analyticsService = analyticsService;
    }
    listAdmin(user, storeId) {
        return this.analyticsService.findAllForStore(user.companyId, storeId);
    }
    getAdmin(user, provider, storeId) {
        return this.analyticsService.findByProvider(user.companyId, storeId, provider);
    }
    upsertAdmin(user, storeId, dto, ip) {
        return this.analyticsService.upsertForCompany(user.companyId, storeId, dto, user, ip);
    }
    updateAdmin(user, storeId, provider, dto, ip) {
        return this.analyticsService.updateByProvider(user.companyId, storeId, provider, dto, user, ip);
    }
    setEnabledAdmin(user, storeId, provider, dto, ip) {
        return this.analyticsService.setEnabled(user.companyId, storeId, provider, dto.enabled, user, ip);
    }
    removeAdmin(user, storeId, provider, ip) {
        return this.analyticsService.remove(user.companyId, storeId, provider, user, ip);
    }
    getStorefront(companyId, storeId) {
        return this.analyticsService.getPublicForStore(companyId, storeId);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.analytics.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "listAdmin", null);
__decorate([
    (0, common_1.Get)('admin/:provider'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.analytics.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('provider')),
    __param(2, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getAdmin", null);
__decorate([
    (0, common_1.Post)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.analytics.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_analytics_dto_1.CreateAnalyticsDto, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "upsertAdmin", null);
__decorate([
    (0, common_1.Patch)('admin/:provider'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.analytics.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Param)('provider')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, update_analytics_dto_1.UpdateAnalyticsDto, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "updateAdmin", null);
__decorate([
    (0, common_1.Patch)('admin/:provider/enabled'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.analytics.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Param)('provider')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, set_enabled_dto_1.SetAnalyticsEnabledDto, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "setEnabledAdmin", null);
__decorate([
    (0, common_1.Delete)('admin/:provider'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['integrations.analytics.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('storeId')),
    __param(2, (0, common_1.Param)('provider')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "removeAdmin", null);
__decorate([
    (0, common_1.Get)('storefront'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AnalyticsController.prototype, "getStorefront", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('integrations/analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map