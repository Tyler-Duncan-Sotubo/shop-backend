import { Module } from '@nestjs/common';
import { StorefrontAnalyticsService } from './services/storefront-analytics.service';
import { StorefrontAnalyticsController } from './controllers/storefront-analytics.controller';
import { AnalyticsTagController } from './controllers/analytics-tag.controller';
import { AnalyticsTagService } from './services/analytics-tag.service';
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller';
import { DashboardAnalyticsService } from './services/dashboard-analytics.service';
import { DashboardCommerceAnalyticsController } from './controllers/dashboard-commerce-analytics.controller';
import { DashboardCommerceAnalyticsService } from './services/dashboard-commerce-analytics.service';

@Module({
  controllers: [
    StorefrontAnalyticsController,
    AnalyticsTagController,
    DashboardAnalyticsController,
    DashboardCommerceAnalyticsController,
  ],
  providers: [
    StorefrontAnalyticsService,
    AnalyticsTagService,
    DashboardAnalyticsService,
    DashboardCommerceAnalyticsService,
  ],
})
export class AnalyticsModule {}
