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
exports.ProductsDiscoveryController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const product_discovery_service_1 = require("../../../../domains/catalog/services/product-discovery.service");
const storefront_guard_1 = require("../../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../common/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../common/decorators/current-store.decorator");
const dto_1 = require("./dto");
const product_mapper_1 = require("../../../../domains/catalog/mappers/product.mapper");
let ProductsDiscoveryController = class ProductsDiscoveryController extends base_controller_1.BaseController {
    constructor(productDiscoveryService) {
        super();
        this.productDiscoveryService = productDiscoveryService;
    }
    async latest(companyId, storeId, query) {
        const rows = await this.productDiscoveryService.listLatestStorefrontProducts(companyId, storeId, {
            limit: query.limit ?? 12,
            offset: query.offset ?? 0,
            search: query.search,
        });
        return (0, product_mapper_1.mapProductsListToStorefront)(rows);
    }
    async onSale(companyId, storeId, query) {
        const rows = await this.productDiscoveryService.listOnSaleStorefrontProducts(companyId, storeId, {
            limit: query.limit ?? 12,
            offset: query.offset ?? 0,
            search: query.search,
        });
        return (0, product_mapper_1.mapProductsListToStorefront)(rows);
    }
    async bestSellers(companyId, storeId, query) {
        const rows = await this.productDiscoveryService.listBestSellerStorefrontProducts(companyId, storeId, {
            limit: query.limit ?? 12,
            offset: query.offset ?? 0,
            windowDays: Number(query.windowDays ?? 30),
        });
        return (0, product_mapper_1.mapProductsListToStorefront)(rows);
    }
};
exports.ProductsDiscoveryController = ProductsDiscoveryController;
__decorate([
    (0, common_1.Get)('latest'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsDiscoveryController.prototype, "latest", null);
__decorate([
    (0, common_1.Get)('on-sale'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsDiscoveryController.prototype, "onSale", null);
__decorate([
    (0, common_1.Get)('best-sellers'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProductsDiscoveryController.prototype, "bestSellers", null);
exports.ProductsDiscoveryController = ProductsDiscoveryController = __decorate([
    (0, common_1.Controller)('storefront-products'),
    __metadata("design:paramtypes", [product_discovery_service_1.ProductDiscoveryService])
], ProductsDiscoveryController);
//# sourceMappingURL=product-discovery.controller.js.map