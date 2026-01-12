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
exports.CompanySettingsController = void 0;
const common_1 = require("@nestjs/common");
const company_settings_service_1 = require("./company-settings.service");
const mark_onboarding_step_dto_1 = require("./dto/mark-onboarding-step.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../common/interceptor/base.controller");
let CompanySettingsController = class CompanySettingsController extends base_controller_1.BaseController {
    constructor(companySettingsService) {
        super();
        this.companySettingsService = companySettingsService;
    }
    syncAllCompanyPermissions() {
        return this.companySettingsService.syncAllCompanySettings();
    }
    async getOnboardingChecklist(user) {
        return this.companySettingsService.getOnboardingChecklist(user.companyId);
    }
    async markOnboardingStep(user, body) {
        await this.companySettingsService.markOnboardingStep(user.companyId, body.step, body.value ?? true);
        return { success: true };
    }
    async getPaymentSettings(user) {
        return this.companySettingsService.getPaymentSettings(user.companyId);
    }
    async getSecuritySettings(user) {
        return this.companySettingsService.getSecuritySettings(user.companyId);
    }
    async getCheckoutSettings(user) {
        return this.companySettingsService.getCheckoutSettings(user.companyId);
    }
    async updateSetting(user, body) {
        await this.companySettingsService.setSetting(user.companyId, body.key, body.value);
    }
};
exports.CompanySettingsController = CompanySettingsController;
__decorate([
    (0, common_1.Post)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompanySettingsController.prototype, "syncAllCompanyPermissions", null);
__decorate([
    (0, common_1.Get)('onboarding'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getOnboardingChecklist", null);
__decorate([
    (0, common_1.Post)('onboarding/step'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mark_onboarding_step_dto_1.MarkOnboardingStepDto]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "markOnboardingStep", null);
__decorate([
    (0, common_1.Get)('payments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getPaymentSettings", null);
__decorate([
    (0, common_1.Get)('security'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getSecuritySettings", null);
__decorate([
    (0, common_1.Get)('checkout'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "getCheckoutSettings", null);
__decorate([
    (0, common_1.Patch)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CompanySettingsController.prototype, "updateSetting", null);
exports.CompanySettingsController = CompanySettingsController = __decorate([
    (0, common_1.Controller)('company-settings'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [company_settings_service_1.CompanySettingsService])
], CompanySettingsController);
//# sourceMappingURL=company-settings.controller.js.map