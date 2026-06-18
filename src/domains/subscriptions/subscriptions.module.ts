// src/domains/subscriptions/subscriptions.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CreditModule } from 'src/domains/credits/credits.module';
import { SubscriptionPlansService } from './services/subscription-plans.service';
import { CompanySubscriptionsService } from './services/company-subscriptions.service';
import { CreditTopupService } from './services/credit-topup.service';
import { SubscriptionWebhookService } from './services/subscription-webhook.service';
import { SubscriptionCronService } from './services/subscription-cron.service';
import { BillingPaystackService } from './services/billing-paystack.service';
import { SubscriptionInvoicesService } from './services/subscription-invoices.service';
import { SubscriptionPaymentService } from './services/subscription-payment.service';
import { BillingSummaryService } from './services/billing-summary.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [HttpModule, CreditModule, NotificationModule],
  providers: [
    SubscriptionPlansService,
    CompanySubscriptionsService,
    CreditTopupService,
    SubscriptionWebhookService,
    SubscriptionCronService,
    BillingPaystackService,
    SubscriptionInvoicesService,
    SubscriptionPaymentService, // ← new
    BillingSummaryService,
  ],
  exports: [
    SubscriptionPlansService,
    CompanySubscriptionsService,
    CreditTopupService,
    SubscriptionWebhookService,
    BillingPaystackService,
    SubscriptionInvoicesService,
    SubscriptionPaymentService, // ← new
    BillingSummaryService,
  ],
})
export class SubscriptionsModule {}
