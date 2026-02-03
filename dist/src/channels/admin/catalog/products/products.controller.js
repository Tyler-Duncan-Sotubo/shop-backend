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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const products_service_1 = require("../../../../domains/catalog/services/products.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const product_query_dto_1 = require("./dto/product-query.dto");
const current_user_decorator_1 = require("../../common/decorator/current-user.decorator");
const product_mapper_1 = require("../../../../domains/catalog/mappers/product.mapper");
const dto_1 = require("./dto");
const products_report_service_1 = require("../../../../domains/catalog/reports/products-report.service");
let ProductsController = class ProductsController extends base_controller_1.BaseController {
    constructor(productsService, productsReportService) {
        super();
        this.productsService = productsService;
        this.productsReportService = productsReportService;
    }
    listProductsAdmin(user, query) {
        return this.productsService.listProductsAdmin(user.companyId, query);
    }
    async listProducts(user, query) {
        const products = await this.productsService.listProducts(user.companyId, query.storeId, query);
        return products;
    }
    async getProduct(user, productId) {
        const product = await this.productsService.getProductWithRelations(user.companyId, productId);
        return (0, product_mapper_1.mapProductToDetailResponse)(product);
    }
    async getProductWithRelations(user, productId) {
        const product = await this.productsService.getProductWithRelations(user.companyId, productId);
        return (0, product_mapper_1.mapProductToDetailResponse)(product);
    }
    async getProductForEdit(user, productId) {
        return this.productsService.getProductForEdit(user.companyId, productId);
    }
    async createProduct(user, dto, ip) {
        const product = await this.productsService.createProduct(user.companyId, dto, user, ip);
        return (0, product_mapper_1.mapProductToDetailResponse)(product);
    }
    async updateProduct(user, productId, dto, ip) {
        const product = await this.productsService.updateProduct(user.companyId, productId, dto, user, ip);
        return (0, product_mapper_1.mapProductToDetailResponse)(product);
    }
    async deleteProduct(user, productId, ip) {
        return this.productsService.deleteProduct(user.companyId, productId, user, ip);
    }
    async exportProducts(user, format = 'csv', storeId, status, includeMetaJson) {
        const url = await this.productsReportService.exportProductsToS3(user.companyId, {
            format,
            storeId,
            status,
            includeMetaJson: includeMetaJson === 'true',
        });
        return { url };
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "listProductsAdmin", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "listProducts", null);
__decorate([
    (0, common_1.Get)(':productId'),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProduct", null);
__decorate([
    (0, common_1.Get)(':productId/full'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductWithRelations", null);
__decorate([
    (0, common_1.Get)(':productId/edit'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductForEdit", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.SetMetadata)('permissions', ['products.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.CreateProductDto, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "createProduct", null);
__decorate([
    (0, common_1.Patch)(':productId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, dto_1.UpdateProductDto, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)(':productId'),
    (0, common_1.SetMetadata)('permissions', ['products.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "deleteProduct", null);
__decorate([
    (0, common_1.Get)('export-products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.update']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('format')),
    __param(2, (0, common_1.Query)('storeId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('includeMetaJson')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "exportProducts", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)('catalog/products'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        products_report_service_1.ProductsReportService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map