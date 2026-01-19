import { Module } from '@nestjs/common';
import { DashboardAnalyticsController } from './controllers/dashboard-analytics.controller';
import { DashboardCommerceAnalyticsController } from './controllers/dashboard-commerce-analytics.controller';

@Module({
  controllers: [
    DashboardAnalyticsController,
    DashboardCommerceAnalyticsController,
  ],
})
export class AdminAnalyticsModule {}
