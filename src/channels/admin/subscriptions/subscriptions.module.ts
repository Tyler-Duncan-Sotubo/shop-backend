import { Module } from '@nestjs/common';
import {
  SubscriptionsController,
  BillingWebhookController,
} from './subscriptions.controller';
import { SubscriptionsModule } from 'src/domains/subscriptions/subscriptions.module';

@Module({
  imports: [SubscriptionsModule],
  controllers: [SubscriptionsController, BillingWebhookController],
})
export class AdminSubscriptionsModule {}
