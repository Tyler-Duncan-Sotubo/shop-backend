import { Module } from '@nestjs/common';
import { PickupService } from './pickup.service';
import { PickupController } from './pickup.controller';
import { StoresService } from 'src/modules/commerce/stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [PickupController],
  providers: [PickupService, StoresService, AwsService],
})
export class PickupModule {}
