import { Module } from '@nestjs/common';
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller';
import { DashboardCommerceAnalyticsController } from './controllers/dashboard-commerce-analytics.controller';
import { DashboardExtendedAnalyticsController } from './controllers/dashboard-extended.controller';

@Module({
  controllers: [
    DashboardAnalyticsController,
    DashboardCommerceAnalyticsController,
    DashboardExtendedAnalyticsController,
  ],
})
export class AdminAnalyticsModule {}
