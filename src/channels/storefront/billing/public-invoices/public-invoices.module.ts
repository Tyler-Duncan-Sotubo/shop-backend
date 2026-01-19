import { Module } from '@nestjs/common';
import { PublicInvoicesController } from './public-invoices.controller';

@Module({
  controllers: [PublicInvoicesController],
})
export class PublicInvoicesModule {}
