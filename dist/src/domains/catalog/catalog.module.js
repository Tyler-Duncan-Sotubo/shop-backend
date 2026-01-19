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
const linked_products_service_1 = require("./services/linked-products.service");
const aws_service_1 = require("../../infrastructure/aws/aws.service");
const inventory_stock_service_1 = require("../commerce/inventory/services/inventory-stock.service");
const inventory_locations_service_1 = require("../commerce/inventory/services/inventory-locations.service");
const api_keys_service_1 = require("../iam/api-keys/api-keys.service");
const inventory_ledger_service_1 = require("../commerce/inventory/services/inventory-ledger.service");
const stores_service_1 = require("../commerce/stores/stores.service");
const product_discovery_service_1 = require("./services/product-discovery.service");
const media_service_1 = require("../media/media.service");
let CatalogModule = class CatalogModule {
};
exports.CatalogModule = CatalogModule;
exports.CatalogModule = CatalogModule = __decorate([
    (0, common_1.Module)({
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
            stores_service_1.StoresService,
            product_discovery_service_1.ProductDiscoveryService,
            media_service_1.MediaService,
        ],
        exports: [
            products_service_1.ProductsService,
            variants_service_1.VariantsService,
            options_service_1.OptionsService,
            images_service_1.ImagesService,
            categories_service_1.CategoriesService,
            linked_products_service_1.LinkedProductsService,
            product_discovery_service_1.ProductDiscoveryService,
        ],
    })
], CatalogModule);
//# sourceMappingURL=catalog.module.js.map