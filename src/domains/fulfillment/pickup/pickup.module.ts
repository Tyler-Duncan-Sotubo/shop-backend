import { Module } from '@nestjs/common';
import { PickupService } from './pickup.service';
import { StoresService } from 'src/domains/commerce/stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [PickupService, StoresService, AwsService],
  exports: [PickupService],
})
export class PickupModule {}
