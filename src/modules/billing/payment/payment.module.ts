import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { InvoiceService } from '../invoice/invoice.service';
import { InvoiceTotalsService } from '../invoice/invoice-totals.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, InvoiceService, InvoiceTotalsService],
})
export class PaymentModule {}
