import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AwsService } from 'src/common/aws/aws.service';
import { StoresService } from 'src/modules/commerce/stores/stores.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, StoresService, AwsService],
})
export class AnalyticsModule {}
