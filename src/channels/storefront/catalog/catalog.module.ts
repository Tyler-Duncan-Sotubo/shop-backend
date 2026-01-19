import { Module } from '@nestjs/common';
import { StorefrontLinkedProductsModule } from './linked-products/linked-products.module';
import { StorefrontCategoriesModule } from './categories/categories.module';
import { StorefrontProductsModule } from './products/products.module';

@Module({
  imports: [
    StorefrontCategoriesModule,
    StorefrontLinkedProductsModule,
    StorefrontProductsModule,
  ],
})
export class StorefrontCatalogModule {}
