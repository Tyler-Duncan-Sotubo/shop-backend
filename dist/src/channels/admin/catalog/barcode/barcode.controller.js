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
exports.BarcodeController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const barcode_service_1 = require("../../../../domains/catalog/services/barcode.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
let BarcodeController = class BarcodeController extends base_controller_1.BaseController {
    constructor(barcodes) {
        super();
        this.barcodes = barcodes;
    }
    async generateForVariant(user, variantId, format) {
        return this.barcodes.generateForVariant(user.companyId, variantId, format ?? 'code128');
    }
    async lookup(user, value, storeId) {
        return this.barcodes.lookupByBarcode(user.companyId, storeId, value);
    }
    async generateLabelsPdf(user, variantIds, format) {
        return this.barcodes.generateLabelsPdf(user.companyId, variantIds, format ?? 'code128');
    }
    async bulkGenerateForProduct(user, productId, format) {
        return this.barcodes.bulkGenerateForProduct(user.companyId, productId, format ?? 'code128');
    }
    async bulkGenerateForStore(user, storeId, format, skipExisting) {
        return this.barcodes.bulkGenerateForStore(user.companyId, storeId, format ?? 'code128', { skipExisting: skipExisting ?? true });
    }
};
exports.BarcodeController = BarcodeController;
__decorate([
    (0, common_1.Post)('variants/:variantId/generate'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('variantId')),
    __param(2, (0, common_1.Body)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "generateForVariant", null);
__decorate([
    (0, common_1.Get)('lookup'),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('value')),
    __param(2, (0, common_1.Query)('storeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "lookup", null);
__decorate([
    (0, common_1.Post)('labels/pdf'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('variantIds')),
    __param(2, (0, common_1.Body)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array, String]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "generateLabelsPdf", null);
__decorate([
    (0, common_1.Post)('products/:productId/generate-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "bulkGenerateForProduct", null);
__decorate([
    (0, common_1.Post)('stores/:storeId/generate-all'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('storeId')),
    __param(2, (0, common_1.Body)('format')),
    __param(3, (0, common_1.Body)('skipExisting')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Boolean]),
    __metadata("design:returntype", Promise)
], BarcodeController.prototype, "bulkGenerateForStore", null);
exports.BarcodeController = BarcodeController = __decorate([
    (0, common_1.Controller)('catalog/barcodes'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __metadata("design:paramtypes", [barcode_service_1.BarcodeService])
], BarcodeController);
//# sourceMappingURL=barcode.controller.js.map