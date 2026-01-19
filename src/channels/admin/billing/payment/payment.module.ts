import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { PaymentReceiptController } from './controllers/payment-receipt.controller';
import { PaymentMethodsController } from './controllers/payment-methods.controller';

@Module({
  controllers: [
    PaymentController,
    PaymentReceiptController,
    PaymentMethodsController,
  ],
})
export class PaymentModule {}
