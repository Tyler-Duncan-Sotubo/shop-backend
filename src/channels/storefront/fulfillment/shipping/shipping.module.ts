import { Module } from '@nestjs/common';
import { StorefrontShippingController } from './shipping.controller';

@Module({
  controllers: [StorefrontShippingController],
})
export class StorefrontShippingModule {}
