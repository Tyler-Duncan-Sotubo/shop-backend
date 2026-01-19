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
exports.StorefrontProductsController = void 0;
const common_1 = require("@nestjs/common");
const base_controller_1 = require("../../../../infrastructure/interceptor/base.controller");
const products_service_1 = require("../../../../domains/catalog/services/products.service");
const product_query_dto_1 = require("./dto/product-query.dto");
const storefront_guard_1 = require("../../common/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../common/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../common/decorators/current-store.decorator");
const product_mapper_1 = require("../../../../domains/catalog/mappers/product.mapper");
let StorefrontProductsController = class StorefrontProductsController extends base_controller_1.BaseController {
    constructor(productsService) {
        super();
        this.productsService = productsService;
    }
    async listStorefrontProducts(companyId, storeId, query) {
        const products = await this.productsService.listProducts(companyId, storeId, query);
        return (0, product_mapper_1.mapProductsListToStorefront)(products);
    }
    async getProductBySlug(companyId, slug) {
        const product = await this.productsService.getProductWithRelationsBySlug(companyId, slug);
        return (0, product_mapper_1.mapProductToDetailResponse)(product);
    }
    async listCollectionProducts(companyId, storeId, slug, query) {
        const collection = await this.productsService.listCollectionProductsByCategorySlug(companyId, storeId, slug, query);
        return collection;
    }
    async listProductsGroupedByCollectionSlug(companyId, storeId, slug, query) {
        const result = await this.productsService.listProductsGroupedUnderParentCategorySlug(companyId, storeId, slug, query);
        if (!result?.parent) {
            return {
                parent: null,
                groups: [],
                exploreMore: [],
            };
        }
        return {
            parent: result.parent,
            groups: result.groups.map((group) => ({
                category: group.category,
                products: group.products,
            })),
            exploreMore: result.exploreMore,
        };
    }
};
exports.StorefrontProductsController = StorefrontProductsController;
__decorate([
    (0, common_1.Get)('storefront'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], StorefrontProductsController.prototype, "listStorefrontProducts", null);
__decorate([
    (0, common_1.Get)('storefront/:slug'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StorefrontProductsController.prototype, "getProductBySlug", null);
__decorate([
    (0, common_1.Get)('storefront/collections/:slug'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('slug')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], StorefrontProductsController.prototype, "listCollectionProducts", null);
__decorate([
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    (0, common_1.Get)('storefront/collections/:slug/grouped'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('slug')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], StorefrontProductsController.prototype, "listProductsGroupedByCollectionSlug", null);
exports.StorefrontProductsController = StorefrontProductsController = __decorate([
    (0, common_1.Controller)('catalog/products'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __metadata("design:paramtypes", [products_service_1.ProductsService])
], StorefrontProductsController);
//# sourceMappingURL=storefront-product.controller.js.map