import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [StoresController],
  providers: [StoresService, AwsService],
  exports: [StoresService, AwsService],
})
export class StoresModule {}
