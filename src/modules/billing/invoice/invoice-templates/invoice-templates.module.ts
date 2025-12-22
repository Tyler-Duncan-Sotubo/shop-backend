import { Module } from '@nestjs/common';
import { InvoiceTemplatesService } from './invoice-templates.service';
import { InvoiceTemplatesController } from './invoice-templates.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [InvoiceTemplatesController],
  providers: [InvoiceTemplatesService, InvoicePdfService, AwsService],
})
export class InvoiceTemplatesModule {}
