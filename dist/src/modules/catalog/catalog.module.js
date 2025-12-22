"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogModule = void 0;
const common_1 = require("@nestjs/common");
const products_service_1 = require("./services/products.service");
const variants_service_1 = require("./services/variants.service");
const options_service_1 = require("./services/options.service");
const images_service_1 = require("./services/images.service");
const categories_service_1 = require("./services/categories.service");
const products_controller_1 = require("./controllers/products.controller");
const variants_controller_1 = require("./controllers/variants.controller");
const options_controller_1 = require("./controllers/options.controller");
const images_controller_1 = require("./controllers/images.controller");
const categories_controller_1 = require("./controllers/categories.controller");
const linked_products_controller_1 = require("./controllers/linked-products.controller");
const linked_products_service_1 = require("./services/linked-products.service");
const aws_service_1 = require("../../common/aws/aws.service");
const inventory_stock_service_1 = require("../commerce/inventory/services/inventory-stock.service");
const inventory_locations_service_1 = require("../commerce/inventory/services/inventory-locations.service");
const api_keys_service_1 = require("../iam/api-keys/api-keys.service");
const inventory_ledger_service_1 = require("../commerce/inventory/services/inventory-ledger.service");
let CatalogModule = class CatalogModule {
};
exports.CatalogModule = CatalogModule;
exports.CatalogModule = CatalogModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            products_controller_1.ProductsController,
            variants_controller_1.VariantsController,
            options_controller_1.OptionsController,
            images_controller_1.ImagesController,
            categories_controller_1.CategoriesController,
            linked_products_controller_1.LinkedProductsController,
        ],
        providers: [
            products_service_1.ProductsService,
            variants_service_1.VariantsService,
            options_service_1.OptionsService,
            images_service_1.ImagesService,
            categories_service_1.CategoriesService,
            linked_products_service_1.LinkedProductsService,
            aws_service_1.AwsService,
            inventory_stock_service_1.InventoryStockService,
            inventory_locations_service_1.InventoryLocationsService,
            api_keys_service_1.ApiKeysService,
            inventory_ledger_service_1.InventoryLedgerService,
        ],
        exports: [products_service_1.ProductsService, variants_service_1.VariantsService],
    })
], CatalogModule);
//# sourceMappingURL=catalog.module.js.map