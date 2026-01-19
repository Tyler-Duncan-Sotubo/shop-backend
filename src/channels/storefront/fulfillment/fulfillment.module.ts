import { Module } from '@nestjs/common';
import { StorefrontPickupModule } from './pickup/pickup.module';

@Module({
  imports: [StorefrontPickupModule],
})
export class StorefrontFulfillmentModule {}
