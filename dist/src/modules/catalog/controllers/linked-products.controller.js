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
exports.LinkedProductsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const linked_products_service_1 = require("../services/linked-products.service");
const class_validator_1 = require("class-validator");
class SetLinkedProductsDto {
}
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SetLinkedProductsDto.prototype, "linkedProductIds", void 0);
let LinkedProductsController = class LinkedProductsController extends base_controller_1.BaseController {
    constructor(linkedProductsService) {
        super();
        this.linkedProductsService = linkedProductsService;
    }
    async getLinkedProducts(user, productId, linkType) {
        return this.linkedProductsService.getLinkedProducts(user.companyId, productId, linkType);
    }
    async setLinkedProducts(user, productId, linkType, dto, ip) {
        const inserted = await this.linkedProductsService.setLinkedProducts(user.companyId, productId, linkType, dto.linkedProductIds, user, ip);
        return inserted;
    }
    async removeLink(user, productId, linkId, ip) {
        return this.linkedProductsService.removeLink(user.companyId, productId, linkId, user, ip);
    }
};
exports.LinkedProductsController = LinkedProductsController;
__decorate([
    (0, common_1.Get)('products/:productId/links'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)('linkType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LinkedProductsController.prototype, "getLinkedProducts", null);
__decorate([
    (0, common_1.Put)('products/:productId/links/:linkType'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Param)('linkType')),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, SetLinkedProductsDto, String]),
    __metadata("design:returntype", Promise)
], LinkedProductsController.prototype, "setLinkedProducts", null);
__decorate([
    (0, common_1.Delete)('products/:productId/links/:linkId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Param)('linkId')),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], LinkedProductsController.prototype, "removeLink", null);
exports.LinkedProductsController = LinkedProductsController = __decorate([
    (0, common_1.Controller)('catalog'),
    __metadata("design:paramtypes", [linked_products_service_1.LinkedProductsService])
], LinkedProductsController);
//# sourceMappingURL=linked-products.controller.js.map