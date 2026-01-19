import { Module } from '@nestjs/common';
import { QuoteController } from './storefront-quote.controller';

@Module({
  controllers: [QuoteController],
})
export class StorefrontQuoteModule {}
