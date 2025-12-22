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
import { ResponseInterceptor } from 'src/common/interceptor/error-interceptor';
import { AuditInterceptor } from 'src/modules/audit/audit.interceptor';
import { Audit } from 'src/modules/audit/audit.decorator';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CompaniesService } from './companies.service';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { User } from '../auth/types/user.type';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseInterceptors(AuditInterceptor)
@Controller('companies')
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
  @UseGuards(JwtAuthGuard)
  async getPaymentSettings(@CurrentUser() user: User) {
    return this.companyService.getCompanyById(user.companyId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateCompany(
    @CurrentUser() user: User,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(user.companyId, dto);
  }
}
