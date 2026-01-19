import { Module } from '@nestjs/common';
import { AdminShippingModule } from './shipping/shipping.module';
import { AdminPickupModule } from './pickup/pickup.module';

@Module({
  imports: [AdminShippingModule, AdminPickupModule],
})
export class FulfillmentModule {}
