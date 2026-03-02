import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { ZohoModule } from './zoho/zoho.module';

@Module({
  imports: [AnalyticsModule, ZohoModule],
})
export class AdminIntegrationModule {}
