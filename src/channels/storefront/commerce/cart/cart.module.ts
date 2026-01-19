import { Module } from '@nestjs/common';
import { StorefrontCartController } from './storefront-carts.controller';

@Module({
  controllers: [StorefrontCartController],
})
export class StorefrontCartModule {}
