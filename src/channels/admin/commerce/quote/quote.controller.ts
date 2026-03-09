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
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { GetQuotesQueryDto } from './dto/get-quotes-query.dto';
import { ConvertQuoteToManualOrderDto } from './dto/convert-quote-to-manual-order.dto';
import { QuoteService } from 'src/domains/commerce/quote/quote.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('quotes')
@UseGuards(JwtAuthGuard)
export class QuoteController extends BaseController {
  constructor(private readonly quoteService: QuoteService) {
    super();
  }

  @Get()
  @SetMetadata('permissions', ['quotes.read'])
  getQuotes(@CurrentUser() user: User, @Query() query: GetQuotesQueryDto) {
    return this.quoteService.findAll(user.companyId, query);
  }

  @Get(':quoteId')
  @SetMetadata('permissions', ['quotes.read'])
  getQuoteById(@CurrentUser() user: User, @Param('quoteId') quoteId: string) {
    return this.quoteService.findOne(user.companyId, quoteId);
  }

  @Post()
  @SetMetadata('permissions', ['quotes.create'])
  createQuote(
    @CurrentUser() user: User,
    @Body() dto: CreateQuoteDto,
    @Ip() ip: string,
  ) {
    return this.quoteService.create(user.companyId, dto, user, ip);
  }

  @Post(':quoteId/items')
  @SetMetadata('permissions', ['quotes.update'])
  addQuoteItems(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Body()
    dto: {
      items: {
        variantId?: string | null;
        quantity?: number;
      }[];
    },
    @Ip() ip: string,
  ) {
    return this.quoteService.addItems(
      user.companyId,
      quoteId,
      dto.items,
      user,
      ip,
    );
  }

  /**
   * Update quantities of quote items
   */
  @Patch(':quoteId/items')
  @SetMetadata('permissions', ['quotes.update'])
  updateQuoteItems(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Body()
    dto: {
      items: {
        itemId: string;
        quantity: number;
      }[];
    },
    @Ip() ip: string,
  ) {
    return this.quoteService.updateItems(
      user.companyId,
      quoteId,
      dto.items,
      user,
      ip,
    );
  }

  /**
   * Remove items from quote
   */
  @Delete(':quoteId/items')
  @SetMetadata('permissions', ['quotes.update'])
  removeQuoteItems(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Body()
    dto: {
      itemIds: string[];
    },
    @Ip() ip: string,
  ) {
    return this.quoteService.removeItems(
      user.companyId,
      quoteId,
      dto.itemIds,
      user,
      ip,
    );
  }

  @Patch(':quoteId')
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

  @Post(':quoteId/send-to-zoho')
  @SetMetadata('permissions', ['quotes.update']) // or better: ['quotes.convert']
  sendToZoho(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Ip() ip: string,
  ) {
    return this.quoteService.sendToZoho(user.companyId, quoteId, user, ip);
  }

  @Delete(':quoteId')
  @SetMetadata('permissions', ['quotes.delete'])
  deleteQuote(
    @CurrentUser() user: User,
    @Param('quoteId') quoteId: string,
    @Ip() ip: string,
  ) {
    return this.quoteService.remove(user.companyId, quoteId, user, ip);
  }
}
