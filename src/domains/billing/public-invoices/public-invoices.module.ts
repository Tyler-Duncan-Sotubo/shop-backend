import { Module } from '@nestjs/common';
import { PublicInvoicesService } from './public-invoices.service';
import { InvoicePdfService } from '../invoice/invoice-templates/invoice-pdf.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [PublicInvoicesService, InvoicePdfService, AwsService],
  exports: [PublicInvoicesService],
})
export class PublicInvoicesModule {}
