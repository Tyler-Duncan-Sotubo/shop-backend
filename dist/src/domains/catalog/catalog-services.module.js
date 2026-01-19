"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogServicesModule = void 0;
const common_1 = require("@nestjs/common");
const categories_service_1 = require("./services/categories.service");
const linked_products_service_1 = require("./services/linked-products.service");
let CatalogServicesModule = class CatalogServicesModule {
};
exports.CatalogServicesModule = CatalogServicesModule;
exports.CatalogServicesModule = CatalogServicesModule = __decorate([
    (0, common_1.Module)({
        providers: [categories_service_1.CategoriesService, linked_products_service_1.LinkedProductsService],
        exports: [categories_service_1.CategoriesService, linked_products_service_1.LinkedProductsService],
    })
], CatalogServicesModule);
//# sourceMappingURL=catalog-services.module.js.map