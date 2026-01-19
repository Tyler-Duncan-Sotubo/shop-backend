import { Module } from '@nestjs/common';
import { LinkedProductsController } from './linked-products.controller';

@Module({
  controllers: [LinkedProductsController],
})
export class StorefrontLinkedProductsModule {}
