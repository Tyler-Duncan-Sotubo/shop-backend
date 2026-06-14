import { Module } from '@nestjs/common';
import { AdminCategoriesModule } from './categories/categories.module';
import { AdminProductImagesModule } from './product-images/product-images.module';
import { AdminLinkedProductsModule } from './linked-products/linked-products.module';
import { AdminVariantOptionsModule } from './variant-options/variant-options.module';
import { AdminVariantsModule } from './variants/variants.module';
import { AdminProductsModule } from './products/products.module';
import { BarcodeModule } from './barcode/barcode.module';

@Module({
  imports: [
    AdminCategoriesModule,
    AdminProductsModule,
    AdminProductImagesModule,
    AdminLinkedProductsModule,
    AdminVariantOptionsModule,
    AdminVariantsModule,
    BarcodeModule,
  ],
})
export class AdminCatalogModule {}
