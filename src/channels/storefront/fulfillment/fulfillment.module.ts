import { Module } from '@nestjs/common';
import { StorefrontPickupModule } from './pickup/pickup.module';
import { StorefrontShippingModule } from './shipping/shipping.module';

@Module({
  imports: [StorefrontPickupModule, StorefrontShippingModule],
})
export class StorefrontFulfillmentModule {}
