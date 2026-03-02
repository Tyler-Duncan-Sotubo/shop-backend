import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceTemplatesModule } from './invoice-templates/invoice-templates.module';
import { InvoicePdfService } from './invoice-templates/invoice-pdf.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { InvoiceTotalsService } from './invoice-totals.service';
import { PaymentService } from '../payment/services/payment.service';
import { ZohoInvoicesService } from 'src/domains/integration/zoho/zoho-invoices.service';
import { ZohoService } from 'src/domains/integration/zoho/zoho.service';
import { ZohoCommonHelper } from 'src/domains/integration/zoho/helpers/zoho-common.helper';

@Module({
  providers: [
    InvoiceService,
    InvoicePdfService,
    AwsService,
    InvoiceTotalsService,
    PaymentService,
    ZohoInvoicesService,
    ZohoService,
    ZohoCommonHelper,
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
    ZohoInvoicesService,
    ZohoService,
    ZohoCommonHelper,
  ],
})
export class InvoiceModule {}
