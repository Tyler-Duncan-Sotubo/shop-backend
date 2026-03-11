import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/storefront-payment.controller';
import { PaymentReceiptController } from './controllers/storefront-payment-receipt.controller';
import { PaymentMethodsController } from './controllers/storefront-payment-methods.controller';
import { PaystackStorefrontController } from './controllers/paystack-storefront.controller';

@Module({
  controllers: [
    PaymentController,
    PaymentReceiptController,
    PaymentMethodsController,
    PaystackStorefrontController,
  ],
})
export class StorefrontPaymentModule {}
