"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontCatalogModule = void 0;
const common_1 = require("@nestjs/common");
const linked_products_module_1 = require("./linked-products/linked-products.module");
const categories_module_1 = require("./categories/categories.module");
const products_module_1 = require("./products/products.module");
let StorefrontCatalogModule = class StorefrontCatalogModule {
};
exports.StorefrontCatalogModule = StorefrontCatalogModule;
exports.StorefrontCatalogModule = StorefrontCatalogModule = __decorate([
    (0, common_1.Module)({
        imports: [
            categories_module_1.StorefrontCategoriesModule,
            linked_products_module_1.StorefrontLinkedProductsModule,
            products_module_1.StorefrontProductsModule,
        ],
    })
], StorefrontCatalogModule);
//# sourceMappingURL=catalog.module.js.map