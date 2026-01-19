"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCatalogModule = void 0;
const common_1 = require("@nestjs/common");
const categories_module_1 = require("./categories/categories.module");
const product_images_module_1 = require("./product-images/product-images.module");
const linked_products_module_1 = require("./linked-products/linked-products.module");
const variant_options_module_1 = require("./variant-options/variant-options.module");
const variants_module_1 = require("./variants/variants.module");
const products_module_1 = require("./products/products.module");
let AdminCatalogModule = class AdminCatalogModule {
};
exports.AdminCatalogModule = AdminCatalogModule;
exports.AdminCatalogModule = AdminCatalogModule = __decorate([
    (0, common_1.Module)({
        imports: [
            categories_module_1.AdminCategoriesModule,
            products_module_1.AdminProductsModule,
            product_images_module_1.AdminProductImagesModule,
            linked_products_module_1.AdminLinkedProductsModule,
            variant_options_module_1.AdminVariantOptionsModule,
            variants_module_1.AdminVariantsModule,
        ],
    })
], AdminCatalogModule);
//# sourceMappingURL=catalog.module.js.map