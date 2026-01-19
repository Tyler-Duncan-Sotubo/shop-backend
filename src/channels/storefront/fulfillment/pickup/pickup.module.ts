import { Module } from '@nestjs/common';
import { PickupController } from './pickup.controller';

@Module({
  controllers: [PickupController],
})
export class StorefrontPickupModule {}
