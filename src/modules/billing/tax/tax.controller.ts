import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { TaxService } from './tax.service';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateTaxDto } from './dto/create-tax.dto';
import { TaxIdParamDto } from './dto/tax-id.param.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { ListTaxesQueryDto } from './dto/list-taxes.query.dto';

@Controller('taxes')
@UseGuards(JwtAuthGuard)
export class TaxController extends BaseController {
  constructor(private readonly taxService: TaxService) {
    super();
  }

  @Post()
  @SetMetadata('permissions', ['billing.taxes.create'])
  create(@CurrentUser() user: User, @Body() dto: CreateTaxDto) {
    return this.taxService.create(user, dto);
  }

  @Get()
  @SetMetadata('permissions', ['billing.taxes.read'])
  list(@CurrentUser() user: User, @Query() q: ListTaxesQueryDto) {
    const active = q.active === undefined ? undefined : q.active === 'true';
    return this.taxService.list(user.companyId, { active, storeId: q.storeId });
  }

  @Get(':taxId')
  @SetMetadata('permissions', ['billing.taxes.read'])
  get(@CurrentUser() user: User, @Param() p: TaxIdParamDto) {
    return this.taxService.getById(user.companyId, p.taxId);
  }

  @Patch(':taxId')
  @SetMetadata('permissions', ['billing.taxes.update'])
  update(
    @CurrentUser() user: User,
    @Param() p: TaxIdParamDto,
    @Body() dto: UpdateTaxDto,
  ) {
    return this.taxService.update(user, p.taxId, dto);
  }

  @Delete(':taxId')
  @SetMetadata('permissions', ['billing.taxes.delete'])
  deactivate(@CurrentUser() user: User, @Param() p: TaxIdParamDto) {
    return this.taxService.deactivate(user, p.taxId);
  }

  @Post(':taxId/default')
  @SetMetadata('permissions', ['billing.taxes.update'])
  setDefault(@CurrentUser() user: User, @Param() p: TaxIdParamDto) {
    return this.taxService.setDefault(user, p.taxId);
  }
}
