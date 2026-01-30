import { Module } from '@nestjs/common';
import { StorefrontIntegrationAnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [StorefrontIntegrationAnalyticsModule],
})
export class StorefrontIntegrationModule {}
