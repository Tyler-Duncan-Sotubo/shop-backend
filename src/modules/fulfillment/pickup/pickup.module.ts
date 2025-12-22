import { Module } from '@nestjs/common';
import { PickupService } from './pickup.service';
import { PickupController } from './pickup.controller';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';

@Module({
  controllers: [PickupController],
  providers: [PickupService, ApiKeysService],
})
export class PickupModule {}
