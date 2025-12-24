import { Global, Module } from '@nestjs/common';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { CacheModule } from 'src/common/cache/cache.module';
import { ExportCleanupService } from 'src/common/services/export-clean.service';
import { CompaniesModule } from './companies/companies.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { IamModule } from './iam/iam.module';
import { NotificationModule } from './notification/notification.module';
import { CustomersModule } from './customers/customers.module';
import { StoresModule } from './commerce/stores/stores.module';
import { InventoryModule } from './commerce/inventory/inventory.module';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './commerce/cart/cart.module';
import { ShippingModule } from './fulfillment/shipping/shipping.module';
import { OrdersModule } from './commerce/orders/orders.module';
import { CheckoutModule } from './commerce/checkout/checkout.module';
import { ReviewsModule } from './reviews/reviews.module';
import { PickupModule } from './fulfillment/pickup/pickup.module';
import { BillingModule } from './billing/billing.module';
import { BlogModule } from './blog/blog.module';
import { MediaModule } from './media/media.module';

@Global()
@Module({
  providers: [ExportCleanupService],
  imports: [
    AuditModule,
    AuthModule,
    DrizzleModule,
    CompanySettingsModule,
    CacheModule,
    CompaniesModule,
    IamModule,
    NotificationModule,
    CustomersModule,
    StoresModule,
    InventoryModule,
    CatalogModule,
    CartModule,
    ShippingModule,
    OrdersModule,
    CheckoutModule,
    ReviewsModule,
    PickupModule,
    BillingModule,
    BlogModule,
    MediaModule,
  ],
  exports: [
    AuditModule,
    AuthModule,
    DrizzleModule,
    CompanySettingsModule,
    CacheModule,
    CompaniesModule,
    IamModule,
    NotificationModule,
  ],
})
export class ModulesModule {}
