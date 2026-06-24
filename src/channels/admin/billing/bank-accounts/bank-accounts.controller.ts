import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { User } from '../../common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CompanyBankAccountsService } from 'src/domains/billing/company-bank-accounts/company-bank-accounts.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('billing/bank-accounts')
@UseGuards(JwtAuthGuard)
export class BankAccountsController extends BaseController {
  constructor(private readonly service: CompanyBankAccountsService) {
    super();
  }

  @Get()
  async list(@CurrentUser() user: User) {
    return this.service.list(user.companyId);
  }

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateBankAccountDto) {
    return this.service.create(user.companyId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankAccountDto,
  ) {
    return this.service.update(user.companyId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(user.companyId, id);
  }
}
