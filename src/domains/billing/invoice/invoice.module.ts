import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceTemplatesModule } from './invoice-templates/invoice-templates.module';
import { InvoicePdfService } from './invoice-templates/invoice-pdf.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { InvoiceTotalsService } from './invoice-totals.service';
import { PaymentService } from '../payment/services/payment.service';

@Module({
  providers: [
    InvoiceService,
    InvoicePdfService,
    AwsService,
    InvoiceTotalsService,
    PaymentService,
  ],
  imports: [InvoiceTemplatesModule],
  exports: [
    InvoiceService,
    InvoiceService,
    InvoicePdfService,
    AwsService,
    InvoiceTotalsService,
    PaymentService,
    InvoiceTemplatesModule,
  ],
})
export class InvoiceModule {}
