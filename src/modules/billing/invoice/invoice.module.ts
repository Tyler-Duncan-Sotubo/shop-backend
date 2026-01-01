import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceTemplatesModule } from './invoice-templates/invoice-templates.module';
import { InvoicePdfService } from './invoice-templates/invoice-pdf.service';
import { AwsService } from 'src/common/aws/aws.service';
import { InvoiceTotalsService } from './invoice-totals.service';
import { PaymentService } from '../payment/payment.service';

@Module({
  controllers: [InvoiceController],
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
  ],
})
export class InvoiceModule {}
