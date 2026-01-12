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
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../auth/decorator/current-user.decorator");
const base_controller_1 = require("../../../common/interceptor/base.controller");
const products_service_1 = require("../services/products.service");
const products_1 = require("../dtos/products");
const product_mapper_1 = require("../mappers/product.mapper");
const storefront_guard_1 = require("../../storefront-config/guard/storefront.guard");
const current_company_id_decorator_1 = require("../../storefront-config/decorators/current-company-id.decorator");
const current_store_decorator_1 = require("../../storefront-config/decorators/current-store.decorator");
const product_discovery_service_1 = require("../services/product-discovery.service");
let ProductsController = class ProductsController extends base_controller_1.BaseController {
    constructor(productsService, productDiscoveryService) {
        super();
        this.productsService = productsService;
        this.productDiscoveryService = productDiscoveryService;
    }
    listProductsAdmin(user, query) {
        return this.productsService.listProductsAdmin(user.companyId, query);
    }
    async listProducts(user, query) {
        const products = await this.productsService.listProducts(user.companyId, query.storeId, query);
        return products;
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
};
exports.ProductsController = ProductsController;
__decorate([
    (0, common_1.Get)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, products_1.ProductQueryDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "listProductsAdmin", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.read']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, products_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "listProducts", null);
__decorate([
    (0, common_1.Get)('storefront'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, products_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "listStorefrontProducts", null);
__decorate([
    (0, common_1.Get)('storefront/:slug'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "getProductBySlug", null);
__decorate([
    (0, common_1.Get)('storefront/collections/:slug'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('slug')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, products_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "listCollectionProducts", null);
__decorate([
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    (0, common_1.Get)('storefront/collections/:slug/grouped'),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Param)('slug')),
    __param(3, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, products_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "listProductsGroupedByCollectionSlug", null);
__decorate([
    (0, common_1.Get)('storefront/latest'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, products_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "latest", null);
__decorate([
    (0, common_1.Get)('storefront/on-sale'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, products_1.ProductQueryDto]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "onSale", null);
__decorate([
    (0, common_1.Get)('storefront/best-sellers'),
    (0, common_1.UseGuards)(storefront_guard_1.StorefrontGuard),
    __param(0, (0, current_company_id_decorator_1.CurrentCompanyId)()),
    __param(1, (0, current_store_decorator_1.CurrentStoreId)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "bestSellers", null);
__decorate([
    (0, common_1.Get)(':productId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
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
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.create']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, products_1.CreateProductDto, String]),
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
    __metadata("design:paramtypes", [Object, String, products_1.UpdateProductDto, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "updateProduct", null);
__decorate([
    (0, common_1.Delete)(':productId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['products.delete']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('productId')),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "deleteProduct", null);
exports.ProductsController = ProductsController = __decorate([
    (0, common_1.Controller)('catalog/products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        product_discovery_service_1.ProductDiscoveryService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map