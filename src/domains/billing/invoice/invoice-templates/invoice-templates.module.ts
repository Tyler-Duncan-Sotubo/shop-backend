import { Module } from '@nestjs/common';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [InvoiceTemplatesService, InvoicePdfService, AwsService],
  exports: [InvoiceTemplatesService, InvoicePdfService],
})
export class InvoiceTemplatesModule {}
