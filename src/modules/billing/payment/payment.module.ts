import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceTotalsService } from '../invoice/invoice-totals.service';
import { AwsService } from 'src/common/aws/aws.service';
import { PaymentReceiptController } from './payment-receipt.controller';
import { PaymentReceiptService } from './payment-receipt.service';
import { ApiKeysService } from 'src/modules/iam/api-keys/api-keys.service';

@Module({
  controllers: [PaymentController, PaymentReceiptController],
  providers: [
    PaymentService,
    InvoiceService,
    InvoiceTotalsService,
    AwsService,
    PaymentReceiptService,
    ApiKeysService,
  ],
})
export class PaymentModule {}
