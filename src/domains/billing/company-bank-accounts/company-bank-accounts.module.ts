import { Module } from '@nestjs/common';
import { CompanyBankAccountsService } from './company-bank-accounts.service';

@Module({
  providers: [CompanyBankAccountsService],
  exports: [CompanyBankAccountsService],
})
export class CompanyBankAccountsModule {}
