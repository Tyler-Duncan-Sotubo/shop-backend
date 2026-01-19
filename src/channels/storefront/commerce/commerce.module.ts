import { Module } from '@nestjs/common';
import { StorefrontCartModule } from './cart/cart.module';
import { StorefrontCheckoutModule } from './checkout/checkout.module';
import { StorefrontOrdersModule } from './orders/orders.module';
import { StorefrontQuoteModule } from './quote/quote.module';

@Module({
  imports: [
    StorefrontCartModule,
    StorefrontCheckoutModule,
    StorefrontOrdersModule,
    StorefrontQuoteModule,
  ],
})
export class CommerceModule {}
