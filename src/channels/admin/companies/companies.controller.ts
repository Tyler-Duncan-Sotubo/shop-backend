import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ResponseInterceptor } from 'src/infrastructure/interceptor/error-interceptor';
import { AuditInterceptor } from 'src/channels/admin/audit/audit.interceptor';
import { Audit } from 'src/channels/admin/audit/audit.decorator';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompaniesService } from 'src/domains/companies/companies.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { User } from 'src/channels/admin/common/types/user.type';
import { UpdateCompanyDto } from './dto/update-company.dto';

@UseInterceptors(AuditInterceptor)
@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companyService: CompaniesService) {}

  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(ResponseInterceptor)
  @Audit({ action: 'Register', entity: 'Authentication' })
  @Post('register')
  async Register(@Body() dto: CreateCompanyDto) {
    return this.companyService.register(dto);
  }

  @Get()
  async getPaymentSettings(@CurrentUser() user: User) {
    return this.companyService.getCompanyById(user.companyId);
  }

  @Patch()
  async updateCompany(
    @CurrentUser() user: User,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(user.companyId, dto);
  }
}
