"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsModule = void 0;
const common_1 = require("@nestjs/common");
const catalog_services_module_1 = require("../catalog-services.module");
const products_service_1 = require("../services/products.service");
const products_collections_service_1 = require("./services/products-collections.service");
const products_helpers_service_1 = require("./services/products-helpers.service");
const products_mutations_service_1 = require("./services/products-mutations.service");
const products_queries_service_1 = require("./services/products-queries.service");
let ProductsModule = class ProductsModule {
};
exports.ProductsModule = ProductsModule;
exports.ProductsModule = ProductsModule = __decorate([
    (0, common_1.Module)({
        imports: [catalog_services_module_1.CatalogServicesModule],
        providers: [
            products_service_1.ProductsService,
            products_queries_service_1.ProductsQueriesService,
            products_collections_service_1.ProductsCollectionsService,
            products_mutations_service_1.ProductsMutationsService,
            products_helpers_service_1.ProductsHelpersService,
        ],
        exports: [
            products_service_1.ProductsService,
            products_queries_service_1.ProductsQueriesService,
            products_collections_service_1.ProductsCollectionsService,
            products_mutations_service_1.ProductsMutationsService,
            products_helpers_service_1.ProductsHelpersService,
        ],
    })
], ProductsModule);
//# sourceMappingURL=products.module.js.map