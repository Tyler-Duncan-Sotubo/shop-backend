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
exports.ImagesController = void 0;
const common_1 = require("@nestjs/common");
const images_service_1 = require("../../../../domains/catalog/services/images.service");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const dto_1 = require("./dto");
let ImagesController = class ImagesController extends base_controller_1.BaseController {
    constructor(imagesService) {
        super();
        this.imagesService = imagesService;
    }
    async getProductImages(user, productId) {
        return this.imagesService.getImages(user.companyId, productId);
    }
    async createImage(user, productId, dto, ip) {
        return this.imagesService.createImage(user.companyId, productId, dto, user, ip);
    }
    async updateImage(user, imageId, dto, ip) {
        return this.imagesService.updateImage(user.companyId, imageId, dto, user, ip);
    }
    async deleteImage(user, imageId, ip) {
        return this.imagesService.deleteImage(user.companyId, imageId, user, ip);
    }
};
exports.ImagesController = ImagesController;
__decorate([
    (0, common_1.Get)('products/:productId'),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "getProductImages", null);
__decorate([
    (0, common_1.Post)('products/:productId'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.CreateImageDto, String]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "createImage", null);
__decorate([
    (0, common_1.Patch)(':imageId'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateImageDto, String]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "updateImage", null);
__decorate([
    (0, common_1.Delete)(':imageId'),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('imageId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ImagesController.prototype, "deleteImage", null);
exports.ImagesController = ImagesController = __decorate([
    (0, common_1.Controller)('product-images'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [images_service_1.ImagesService])
], ImagesController);
//# sourceMappingURL=images.controller.js.map