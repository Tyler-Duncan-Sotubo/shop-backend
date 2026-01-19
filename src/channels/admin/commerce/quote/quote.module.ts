import { Module } from '@nestjs/common';
import { QuoteController } from './quote.controller';

@Module({
  controllers: [QuoteController],
})
export class AdminQuoteModule {}
