import { Module } from '@nestjs/common';
import { StorefrontBlogModule } from './blog/blog.module';
import { StorefrontAnalyticsModule } from './analytics/analytics.module';
import { StorefrontBillingModule } from './billing/billing.module';
import { StorefrontCatalogModule } from './catalog/catalog.module';
import { CommerceModule } from './commerce/commerce.module';
import { StorefrontCustomersModule } from './customers/customers.module';
import { StorefrontFulfillmentModule } from './fulfillment/fulfillment.module';
import { StorefrontIntegrationModule } from './integration/integration.module';
import { StorefrontMailModule } from './mail/mail.module';
import { StorefrontConfigModule } from './storefront-config/storefront-config.module';
import { StorefrontReviewsModule } from './reviews/reviews.module';
import { StorefrontGuardsModule } from './common/guard/storefront-global.guard';
import { StorefrontPaymentModule } from './billing/storefront-payment/payment.module';

@Module({
  imports: [
    StorefrontGuardsModule,
    StorefrontAnalyticsModule,
    StorefrontBillingModule,
    StorefrontBlogModule,
    StorefrontCatalogModule,
    CommerceModule,
    StorefrontCustomersModule,
    StorefrontFulfillmentModule,
    StorefrontIntegrationModule,
    StorefrontMailModule,
    StorefrontConfigModule,
    StorefrontReviewsModule,
    StorefrontPaymentModule,
  ],
})
export class StorefrontModule {}
