import { Module } from '@nestjs/common';
import { PublicInvoicesService } from './public-invoices.service';
import { PublicInvoicesController } from './public-invoices.controller';
import { InvoicePdfService } from '../invoice/invoice-templates/invoice-pdf.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [PublicInvoicesController],
  providers: [PublicInvoicesService, InvoicePdfService, AwsService],
})
export class PublicInvoicesModule {}
