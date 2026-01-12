import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Body,
  UseGuards,
  SetMetadata,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { AdminCustomersService } from './admin-customers.service';
import {
  CreateCustomerAddressAdminDto,
  ListCustomersDto,
  UpdateCustomerAddressAdminDto,
  UpdateCustomerAdminDto,
} from './dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CreateCustomerDto } from './dto/register-customer.dto';
import { Audit } from '../audit/audit.decorator';
import { FileParseInterceptor } from 'src/common/interceptor/file-parse.interceptor';

@Controller('admin/customers')
@UseGuards(JwtAuthGuard)
export class AdminCustomersController extends BaseController {
  constructor(private readonly adminCustomers: AdminCustomersService) {
    super();
  }

  @Post('register')
  async adminRegister(
    @CurrentUser() user: User,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.adminCustomers.adminCreateCustomer(
      user.companyId,
      dto,
      user.id,
    );
  }

  @Post('bulk/:storeId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['customers.update'])
  @Audit({ action: 'Customer Bulk Up', entity: 'Customers' })
  @UseInterceptors(FileParseInterceptor({ field: 'file', maxRows: 500 }))
  async bulkCreateCustomers(
    @Body() rows: any[],
    @CurrentUser() user: User,
    @Param('storeId') storeId: string | null,
  ) {
    return this.adminCustomers.bulkCreateCustomers(
      user.companyId,
      storeId,
      rows,
      user.id,
    );
  }

  @Post(':customerId/addresses')
  @SetMetadata('permissions', ['customers.update'])
  createAddress(
    @CurrentUser() user: User,
    @Param('customerId') customerId: string,
    @Body() dto: CreateCustomerAddressAdminDto,
  ) {
    return this.adminCustomers.createCustomerAddress(
      user.companyId,
      customerId,
      dto,
      user.id,
    );
  }

  @Patch(':customerId/addresses/:addressId')
  updateCustomerAddress(
    @Param('customerId') customerId: string,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateCustomerAddressAdminDto,
    @CurrentUser() user: User,
  ) {
    return this.adminCustomers.updateCustomerAddress(
      user.companyId,
      customerId,
      addressId,
      dto,
      user.id,
    );
  }

  @Get()
  @SetMetadata('permissions', ['customers.read'])
  list(@CurrentUser() user: User, @Query() dto: ListCustomersDto) {
    return this.adminCustomers.listPeople(user.companyId, dto);
  }

  @Get('only')
  @SetMetadata('permissions', ['customers.read'])
  listCustomersOnly(@CurrentUser() user: User, @Query() dto: ListCustomersDto) {
    return this.adminCustomers.listCustomers(user.companyId, dto);
  }

  @Get(':customerId')
  @SetMetadata('permissions', ['customers.read'])
  get(@CurrentUser() user: User, @Param('customerId') customerId: string) {
    return this.adminCustomers.getCustomer(user.companyId, customerId);
  }

  @Patch(':customerId')
  @SetMetadata('permissions', ['customers.update'])
  update(
    @CurrentUser() user: User,
    @Param('customerId') customerId: string,
    @Body() dto: UpdateCustomerAdminDto,
  ) {
    return this.adminCustomers.updateCustomer(
      user.companyId,
      customerId,
      dto,
      user.id,
    );
  }
}
