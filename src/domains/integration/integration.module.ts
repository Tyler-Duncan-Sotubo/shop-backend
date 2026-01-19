import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  exports: [AnalyticsModule],
})
export class IntegrationModule {}
