import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceTotalsService } from '../invoice/invoice-totals.service';
import { AwsService } from 'src/common/aws/aws.service';
import { PaymentReceiptController } from './controllers/payment-receipt.controller';
import { PaymentReceiptService } from './services/payment-receipt.service';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';
import { StoresService } from 'src/modules/commerce/stores/stores.service';
import { PaymentMethodsController } from './controllers/payment-methods.controller';
import { PaymentMethodsService } from './services/payment-methods.service';

@Module({
  controllers: [
    PaymentController,
    PaymentReceiptController,
    PaymentMethodsController,
  ],
  providers: [
    PaymentService,
    InvoiceService,
    InvoiceTotalsService,
    AwsService,
    PaymentReceiptService,
    ApiKeysService,
    StoresService,
    PaymentMethodsService,
  ],
})
export class PaymentModule {}
