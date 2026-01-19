import { Module } from '@nestjs/common';
import { AdminInventoryModule } from './inventory/inventory.module';
import { AdminOrdersModule } from './orders/orders.module';
import { AdminQuoteModule } from './quote/quote.module';
import { AdminStoresModule } from './stores/stores.module';

@Module({
  imports: [
    AdminInventoryModule,
    AdminOrdersModule,
    AdminQuoteModule,
    AdminStoresModule,
  ],
})
export class AdminCommerceModule {}
