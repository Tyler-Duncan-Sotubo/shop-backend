import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [StoresService, AwsService],
  exports: [StoresService, AwsService],
})
export class StoresModule {}
