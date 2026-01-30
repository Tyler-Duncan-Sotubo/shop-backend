import { Module } from '@nestjs/common';
import { StorefrontIntegrationAnalyticsController } from './analytics.controller';

@Module({
  controllers: [StorefrontIntegrationAnalyticsController],
})
export class StorefrontIntegrationAnalyticsModule {}
