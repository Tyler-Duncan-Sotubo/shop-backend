import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoiceTemplatesModule } from './invoice-templates/invoice-templates.module';
import { InvoicePdfService } from './invoice-templates/invoice-pdf.service';
import { AwsService } from 'src/common/aws/aws.service';
import { InvoiceTotalsService } from './invoice-totals.service';

@Module({
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoicePdfService,
    AwsService,
    InvoiceTotalsService,
  ],
  imports: [InvoiceTemplatesModule],
})
export class InvoiceModule {}
