import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { VariantsService } from './services/variants.service';
import { OptionsService } from './services/options.service';
import { ImagesService } from './services/images.service';
import { CategoriesService } from './services/categories.service';

import { ProductsController } from './controllers/products.controller';
import { VariantsController } from './controllers/variants.controller';
import { OptionsController } from './controllers/options.controller';
import { ImagesController } from './controllers/images.controller';
import { CategoriesController } from './controllers/categories.controller';
import { LinkedProductsController } from './controllers/linked-products.controller';
import { LinkedProductsService } from './services/linked-products.service';
import { AwsService } from 'src/common/aws/aws.service';
import { InventoryStockService } from '../commerce/inventory/services/inventory-stock.service';
import { InventoryLocationsService } from '../commerce/inventory/services/inventory-locations.service';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';
import { InventoryLedgerService } from '../commerce/inventory/services/inventory-ledger.service';
import { StoresService } from '../commerce/stores/stores.service';
import { ProductDiscoveryService } from './services/product-discovery.service';

@Module({
  controllers: [
    ProductsController,
    VariantsController,
    OptionsController,
    ImagesController,
    CategoriesController,
    LinkedProductsController,
  ],
  providers: [
    ProductsService,
    VariantsService,
    OptionsService,
    ImagesService,
    CategoriesService,
    LinkedProductsService,
    AwsService,
    InventoryStockService,
    InventoryLocationsService,
    ApiKeysService,
    InventoryLedgerService,
    StoresService,
    ProductDiscoveryService,
  ],
  exports: [ProductsService, VariantsService],
})
export class CatalogModule {}
