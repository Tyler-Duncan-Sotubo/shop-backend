import { Module } from '@nestjs/common';
import { InvoiceModule } from './invoice/invoice.module';
import { PaymentModule } from './payment/payment.module';
import { TaxModule } from './tax/tax.module';
import { PublicInvoicesModule } from './public-invoices/public-invoices.module';
import { BankAccountsModule } from './bank-accounts/bank-accounts.module';

@Module({
  imports: [PublicInvoicesModule, TaxModule, PaymentModule, InvoiceModule, BankAccountsModule],
})
export class BillingModule {}
