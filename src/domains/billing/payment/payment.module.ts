import { Module } from '@nestjs/common';
import { PaymentService } from './services/payment.service';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceTotalsService } from '../invoice/invoice-totals.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { PaymentReceiptService } from './services/payment-receipt.service';
import { ApiKeysService } from 'src/domains/iam/api-keys/api-keys.service';
import { StoresService } from 'src/domains/commerce/stores/stores.service';
import { PaymentMethodsService } from './services/payment-methods.service';

@Module({
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
  exports: [PaymentService, PaymentMethodsService, PaymentReceiptService],
})
export class PaymentModule {}
