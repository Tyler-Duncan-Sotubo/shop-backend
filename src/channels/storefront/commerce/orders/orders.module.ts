import { Module } from '@nestjs/common';
import { StorefrontOrdersController } from './storefront-orders.controller';

@Module({
  controllers: [StorefrontOrdersController],
})
export class StorefrontOrdersModule {}
