import { Module } from '@nestjs/common';
import { StorefrontAnalyticsService } from './services/storefront-analytics.service';
import { DashboardAnalyticsService } from './services/dashboard-analytics.service';
import { DashboardCommerceAnalyticsService } from './services/dashboard-commerce-analytics.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { DashboardExtendedAnalyticsService } from './services/dashboard-extended-analytics.service';

@Module({
  providers: [
    StorefrontAnalyticsService,
    DashboardAnalyticsService,
    DashboardCommerceAnalyticsService,
    DashboardExtendedAnalyticsService,
    StoresService,
    AwsService,
  ],
  exports: [
    StorefrontAnalyticsService,
    DashboardAnalyticsService,
    DashboardCommerceAnalyticsService,
    DashboardExtendedAnalyticsService,
  ],
})
export class AnalyticsModule {}
