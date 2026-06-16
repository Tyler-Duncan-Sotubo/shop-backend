// src/channels/admin/credits/credits.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { CreditService } from 'src/domains/credits/credits.service';
import { AdjustDto, GetTransactionsDto, TopUpDto } from './dto/credits.dto';

@Controller('credits')
@UseGuards(JwtAuthGuard)
export class CreditsController extends BaseController {
  constructor(private readonly credits: CreditService) {
    super();
  }

  @Get('balance')
  getBalance(@CurrentUser() user: User) {
    return this.credits.getBalance(user.companyId);
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: User, @Query() q: GetTransactionsDto) {
    return this.credits.getTransactions(user.companyId, q);
  }

  // ── Admin only ──────────────────────────────────────────────
  // TODO: swap SetMetadata for your actual admin role guard
  // once you share how roles are handled in this channel

  @Post('topup')
  topUp(@CurrentUser() user: User, @Body() body: TopUpDto) {
    return this.credits.topUp(
      user.companyId,
      body.amount,
      body.channel,
      body.note,
    );
  }

  @Post('adjust')
  adjust(@CurrentUser() user: User, @Body() body: AdjustDto) {
    return this.credits.adjust(
      user.companyId,
      body.amount,
      body.channel,
      body.note,
    );
  }
}
