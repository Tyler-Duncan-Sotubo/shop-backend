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
exports.StorefrontIntegrationAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const analytics_service_1 = require("../../../../domains/integration/analytics/analytics.service");
const storefront_guard_1 = require("../../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../common/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../common/decorators/current-store.decorator");
let StorefrontIntegrationAnalyticsController = class StorefrontIntegrationAnalyticsController extends base_controller_1.BaseController {
    constructor(analyticsService) {
        super();
        this.analyticsService = analyticsService;
    }
    getStorefront(companyId, storeId) {
        return this.analyticsService.getPublicForStore(companyId, storeId);
    }
};
exports.StorefrontIntegrationAnalyticsController = StorefrontIntegrationAnalyticsController;
__decorate([
    (0, common_1.Get)('storefront'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], StorefrontIntegrationAnalyticsController.prototype, "getStorefront", null);
exports.StorefrontIntegrationAnalyticsController = StorefrontIntegrationAnalyticsController = __decorate([
    (0, common_1.Controller)('integrations/analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], StorefrontIntegrationAnalyticsController);
//# sourceMappingURL=analytics.controller.js.map