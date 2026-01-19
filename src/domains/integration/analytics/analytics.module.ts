import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { StoresService } from 'src/domains/commerce/stores/stores.service';

@Module({
  providers: [AnalyticsService, StoresService, AwsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
