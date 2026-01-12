import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';

@Module({
  imports: [AnalyticsModule],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class IntegrationModule {}
