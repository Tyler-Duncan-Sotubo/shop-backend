import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { BullModule } from '@nestjs/bullmq';
import { InvoiceService } from '../billing/invoice/invoice.service';
import { InvoiceTotalsService } from '../billing/invoice/invoice-totals.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'permission-seed-queue',
    }),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService, InvoiceService, InvoiceTotalsService],
})
export class CompaniesModule {}
