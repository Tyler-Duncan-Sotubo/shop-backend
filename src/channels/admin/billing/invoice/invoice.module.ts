import { Module } from '@nestjs/common';
import { AdminInvoiceController } from './invoice.controller';
import { AdminInvoiceTemplatesController } from './invoice-templates.controller';

@Module({
  controllers: [AdminInvoiceController, AdminInvoiceTemplatesController],
})
export class InvoiceModule {}
