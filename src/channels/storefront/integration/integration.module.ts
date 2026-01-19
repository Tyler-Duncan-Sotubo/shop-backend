import { Module } from '@nestjs/common';
import { StorefrontAnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [StorefrontAnalyticsModule],
})
export class StorefrontIntegrationModule {}
