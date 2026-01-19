import { Module } from '@nestjs/common';
import { StorefrontCheckoutController } from './storefront-checkout.controller';

@Module({
  controllers: [StorefrontCheckoutController],
})
export class StorefrontCheckoutModule {}
