import { Module } from '@nestjs/common';
import { BankAccountsController } from './bank-accounts.controller';
import { CompanyBankAccountsModule } from 'src/domains/billing/company-bank-accounts/company-bank-accounts.module';

@Module({
  imports: [CompanyBankAccountsModule],
  controllers: [BankAccountsController],
})
export class BankAccountsModule {}
