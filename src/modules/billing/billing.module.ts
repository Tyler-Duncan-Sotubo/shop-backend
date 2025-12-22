import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module';
import { InvoiceModule } from './invoice/invoice.module';
import { TaxModule } from './tax/tax.module';
import { PublicInvoicesModule } from './public-invoices/public-invoices.module';

@Module({
  imports: [PaymentModule, InvoiceModule, TaxModule, PublicInvoicesModule],
})
export class BillingModule {}
