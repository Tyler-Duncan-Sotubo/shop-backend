// src/features/quote/quote.controller.ts
import { Body, Controller, Ip, Post, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { StorefrontGuard } from '../../common/guard/storefront.guard';
import { CurrentStoreId } from '../../common/decorators/current-store.decorator';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuoteService } from 'src/domains/commerce/quote/quote.service';

@Controller('quotes/storefront-quotes')
@UseGuards(StorefrontGuard)
export class QuoteController extends BaseController {
  constructor(private readonly quoteService: QuoteService) {
    super();
  }

  @Post('')
  async submitQuoteFromStorefront(
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateQuoteDto,
    @Ip() ip: string,
  ) {
    return this.quoteService.createFromStorefront(storeId, dto, ip);
  }
}
