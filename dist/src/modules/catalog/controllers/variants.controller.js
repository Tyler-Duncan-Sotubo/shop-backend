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
exports.VariantsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const variants_service_1 = require("../services/variants.service");
const variants_1 = require("../dtos/variants");
const variant_mapper_1 = require("../mappers/variant.mapper");
const store_vairants_dto_1 = require("../dtos/variants/store-vairants.dto");
let VariantsController = class VariantsController extends base_controller_1.BaseController {
    constructor(variantsService) {
        super();
        this.variantsService = variantsService;
    }
    async listVariantsForProduct(user, productId, query) {
        const variants = await this.variantsService.listVariants(user.companyId, {
            ...query,
            productId,
        });
        return variants.map((r) => (0, variant_mapper_1.mapVariantToResponseWithImage)(r.variant, r.image ?? null, r.inventory ?? null));
    }
    async listForStore(user, query) {
        const data = await this.variantsService.listStoreVariantsForCombobox(user.companyId, query);
        return data;
    }
    async getVariant(user, variantId) {
        const variant = await this.variantsService.getVariantById(user.companyId, variantId);
        return (0, variant_mapper_1.mapVariantToResponse)(variant);
    }
    async createVariant(user, productId, dto, ip) {
        const variant = await this.variantsService.createVariant(user.companyId, productId, dto, user, ip);
        return (0, variant_mapper_1.mapVariantToResponse)(variant);
    }
    async generateVariantsForProduct(user, productId, ip) {
        const inserted = await this.variantsService.generateVariantsForProduct(user.companyId, productId, user, ip);
        return inserted.map(variant_mapper_1.mapVariantToResponse);
    }
    async updateVariant(user, variantId, dto, ip) {
        const variant = await this.variantsService.updateVariant(user.companyId, variantId, dto, user, ip);
        return (0, variant_mapper_1.mapVariantToResponse)(variant);
    }
    async deleteVariant(user, variantId, ip) {
        return this.variantsService.deleteVariant(user.companyId, variantId, user, ip);
    }
};
exports.VariantsController = VariantsController;
__decorate([
    (0, common_1.Get)('products/:productId/variants'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, variants_1.VariantQueryDto]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "listVariantsForProduct", null);
__decorate([
    (0, common_1.Get)('/products/variants/store'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, store_vairants_dto_1.StoreVariantQueryDto]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "listForStore", null);
__decorate([
    (0, common_1.Get)('variants/:variantId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('variantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "getVariant", null);
__decorate([
    (0, common_1.Post)('products/:productId/variants'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, variants_1.CreateVariantDto, String]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "createVariant", null);
__decorate([
    (0, common_1.Post)('products/:productId/variants/generate'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "generateVariantsForProduct", null);
__decorate([
    (0, common_1.Patch)('variants/:variantId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('variantId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, variants_1.UpdateVariantDto, String]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "updateVariant", null);
__decorate([
    (0, common_1.Delete)('variants/:variantId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('variantId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], VariantsController.prototype, "deleteVariant", null);
exports.VariantsController = VariantsController = __decorate([
    (0, common_1.Controller)('catalog'),
    __metadata("design:paramtypes", [variants_service_1.VariantsService])
], VariantsController);
//# sourceMappingURL=variants.controller.js.map