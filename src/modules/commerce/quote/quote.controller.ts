// src/features/quote/quote.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { BaseController } from 'src/common/interceptor/base.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GetQuotesQueryDto } from './dto/get-quotes-query.dto';
import { ConvertQuoteToManualOrderDto } from './dto/convert-quote-to-manual-order.dto';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';

@Controller('quotes')
export class QuoteController extends BaseController {
  constructor(private readonly quoteService: QuoteService) {
    super();
  }

  // --------------------------------------------------------------------------
  // Quotes (admin)
  // --------------------------------------------------------------------------

  @Get()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['quotes.read'])
  getQuotes(@CurrentUser() user: User, @Query() query: GetQuotesQueryDto) {
    return this.quoteService.findAll(user.companyId, query);
  }

  @Get(':quoteId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['quotes.read'])
  getQuoteById(@CurrentUser() user: User, @Param('quoteId') quoteId: string) {
    return this.quoteService.findOne(user.companyId, quoteId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['quotes.create'])
  createQuote(
    @CurrentUser() user: User,
    @Body() dto: CreateQuoteDto,
    @Ip() ip: string,
  ) {
    return this.quoteService.create(user.companyId, dto, user, ip);
  }

  @Patch(':quoteId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['quotes.update'])
  updateQuote(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Body() dto: UpdateQuoteDto,
    @Ip() ip: string,
  ) {
    return this.quoteService.update(user.companyId, quoteId, dto, user, ip);
  }

  /**
   * Convert quote -> draft manual/POS order (adds items + links quote)
   */
  @Post(':quoteId/convert-to-order')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['quotes.update']) // or better: ['quotes.convert']
  convertQuoteToOrder(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Body() dto: ConvertQuoteToManualOrderDto,
    @Ip() ip: string,
  ) {
    return this.quoteService.convertToManualOrder(
      user.companyId,
      quoteId,
      dto,
      user,
      ip,
    );
  }

  @Delete(':quoteId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['quotes.delete'])
  deleteQuote(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Ip() ip: string,
  ) {
    return this.quoteService.remove(user.companyId, quoteId, user, ip);
  }

  // --------------------------------------------------------------------------
  // Storefront
  // --------------------------------------------------------------------------

  @Post('storefront-quotes')
  @UseGuards(StorefrontGuard)
  async submitQuoteFromStorefront(
    @CurrentStoreId() storeId: string,
    @Body() dto: CreateQuoteDto,
    @Ip() ip: string,
  ) {
    return this.quoteService.createFromStorefront(storeId, dto, ip);
  }
}
