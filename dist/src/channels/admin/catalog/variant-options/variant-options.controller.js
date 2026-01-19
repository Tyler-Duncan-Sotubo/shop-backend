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
exports.VariantOptionsController = void 0;
const common_1 = require("@nestjs/common");
const options_service_1 = require("../../../../domains/catalog/services/options.service");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const dto_1 = require("./dto");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let VariantOptionsController = class VariantOptionsController extends base_controller_1.BaseController {
    constructor(optionsService) {
        super();
        this.optionsService = optionsService;
    }
    async getOptionsForProduct(user, productId) {
        return this.optionsService.getOptionsWithValues(user.companyId, productId);
    }
    async createOption(user, productId, dto, ip) {
        return this.optionsService.createOption(user.companyId, productId, dto, user, ip);
    }
    async updateOption(user, optionId, dto, ip) {
        return this.optionsService.updateOption(user.companyId, optionId, dto, user, ip);
    }
    async deleteOption(user, optionId, ip) {
        return this.optionsService.deleteOption(user.companyId, optionId, user, ip);
    }
    async createOptionValue(user, optionId, dto, ip) {
        return this.optionsService.createOptionValue(user.companyId, optionId, dto, user, ip);
    }
    async updateOptionValue(user, valueId, dto, ip) {
        return this.optionsService.updateOptionValue(user.companyId, valueId, dto, user, ip);
    }
    async deleteOptionValue(user, valueId, ip) {
        return this.optionsService.deleteOptionValue(user.companyId, valueId, user, ip);
    }
};
exports.VariantOptionsController = VariantOptionsController;
__decorate([
    (0, common_1.Get)('products/:productId/options'),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "getOptionsForProduct", null);
__decorate([
    (0, common_1.Post)('products/:productId/options'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CreateOptionDto, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "createOption", null);
__decorate([
    (0, common_1.Patch)('options/:optionId'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('optionId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateOptionDto, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "updateOption", null);
__decorate([
    (0, common_1.Delete)('options/:optionId'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('optionId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "deleteOption", null);
__decorate([
    (0, common_1.Post)('options/:optionId/values'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('optionId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CreateOptionValueDto, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "createOptionValue", null);
__decorate([
    (0, common_1.Patch)('option-values/:valueId'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('valueId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateOptionValueDto, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "updateOptionValue", null);
__decorate([
    (0, common_1.Delete)('option-values/:valueId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('valueId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VariantOptionsController.prototype, "deleteOptionValue", null);
exports.VariantOptionsController = VariantOptionsController = __decorate([
    (0, common_1.Controller)('catalog'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [options_service_1.OptionsService])
], VariantOptionsController);
//# sourceMappingURL=variant-options.controller.js.map