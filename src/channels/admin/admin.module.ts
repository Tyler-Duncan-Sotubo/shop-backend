import { Module } from '@nestjs/common';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { AdminAuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { AdminBlogModule } from './blog/blog.module';
import { AdminAuditModule } from './audit/audit.module';
import { AdminCatalogModule } from './catalog/catalog.module';
import { AdminCommerceModule } from './commerce/commerce.module';
import { AdminCompaniesModule } from './companies/companies.module';
import { AdminCompanySettingsModule } from './company-settings/company-settings.module';
import { AdminCustomersModule } from './customers/customers.module';
import { FulfillmentModule } from './fulfillment/fulfillment.module';
import { AdminIamModule } from './iam/iam.module';
import { AdminIntegrationModule } from './integration/integration.module';
import { AdminMailModule } from './mail/mail.module';
import { AdminMediaModule } from './media/media.module';
import { AdminSetupModule } from './setup/setup.module';
import { AdminStorefrontConfigModule } from './storefront-config/storefront-config.module';
import { AdminReviewsModule } from './reviews/reviews.module';
import { GuardsModule } from './common/guards/guards.module';
import { AdminAnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    GuardsModule,
    AdminAnalyticsModule,
    AdminCompanySettingsModule,
    AdminCustomersModule,
    AdminAuditModule,
    AdminAuthModule,
    BillingModule,
    AdminBlogModule,
    AdminCatalogModule,
    AdminCommerceModule,
    AdminCompaniesModule,
    FulfillmentModule,
    AdminIamModule,
    AdminIntegrationModule,
    AdminMailModule,
    AdminMediaModule,
    AdminSetupModule,
    AdminStorefrontConfigModule,
    AdminReviewsModule,
  ],
  providers: [AwsService],
  exports: [AwsService],
})
export class AdminModule {}
