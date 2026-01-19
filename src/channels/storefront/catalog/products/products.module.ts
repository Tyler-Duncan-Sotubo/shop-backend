import { Module } from '@nestjs/common';
import { ProductsDiscoveryController } from './product-discovery.controller';
import { StorefrontProductsController } from './storefront-product.controller';

@Module({
  controllers: [ProductsDiscoveryController, StorefrontProductsController],
})
export class StorefrontProductsModule {}
