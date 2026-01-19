import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { BullModule } from '@nestjs/bullmq';
import { InvoiceService } from '../billing/invoice/invoice.service';
import { InvoiceTotalsService } from '../billing/invoice/invoice-totals.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'permission-seed-queue',
    }),
  ],
  providers: [CompaniesService, InvoiceService, InvoiceTotalsService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
