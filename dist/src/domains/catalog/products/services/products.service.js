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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const products_queries_service_1 = require("./products-queries.service");
const products_collections_service_1 = require("./products-collections.service");
const products_mutations_service_1 = require("./products-mutations.service");
let ProductsService = class ProductsService {
    constructor(queries, collections, mutations) {
        this.queries = queries;
        this.collections = collections;
        this.mutations = mutations;
    }
    listProductsAdmin(companyId, query) {
        return this.queries.listProductsAdmin(companyId, query);
    }
    listProducts(companyId, storeId, query) {
        return this.queries.listProducts(companyId, storeId, query);
    }
    getProductWithRelationsBySlug(companyId, slug) {
        return this.queries.getProductWithRelationsBySlug(companyId, slug);
    }
    listProductsWithRelations(companyId, opts) {
        return this.queries.listProductsWithRelations(companyId, opts);
    }
    listCollectionProductsByCategorySlug(companyId, storeId, slug, q) {
        return this.collections.listCollectionProductsByCategorySlug(companyId, storeId, slug, q);
    }
    listProductsGroupedUnderParentCategory(companyId, storeId, parentId, q) {
        return this.collections.listProductsGroupedUnderParentCategory(companyId, storeId, parentId, q);
    }
    listProductsGroupedUnderParentCategorySlug(companyId, storeId, parentSlug, q) {
        return this.collections.listProductsGroupedUnderParentCategorySlug(companyId, storeId, parentSlug, q);
    }
    createProduct(companyId, dto, user, ip) {
        return this.mutations.createProduct(companyId, dto, user, ip);
    }
    updateProduct(companyId, productId, dto, user, ip) {
        return this.mutations.updateProduct(companyId, productId, dto, user, ip);
    }
    deleteProduct(companyId, productId, user, ip) {
        return this.mutations.deleteProduct(companyId, productId, user, ip);
    }
    assignCategories(companyId, productId, dto, user, ip) {
        return this.mutations.assignCategories(companyId, productId, dto, user, ip);
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [products_queries_service_1.ProductsQueriesService,
        products_collections_service_1.ProductsCollectionsService,
        products_mutations_service_1.ProductsMutationsService])
], ProductsService);
//# sourceMappingURL=products.service.js.map