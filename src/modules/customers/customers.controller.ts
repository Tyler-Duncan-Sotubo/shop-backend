import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CurrentCustomer } from './decorators/current-customer.decorator';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { AuthCustomer } from './types/customers';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';
import { ApiScopes } from 'src/modules/iam/api-keys/decorators/api-scopes.decorator';
import { ApiKeyGuard } from 'src/modules/iam/api-keys/guard/api-key.guard';
import { CurrentCompanyId } from 'src/modules/iam/api-keys/decorators/current-company-id.decorator';

@Controller('storefront/customers')
@UseGuards(ApiKeyGuard) // ✅ storefront always requires API key
@ApiScopes('storefront') // ✅ or whatever scope you use for storefront
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly customerAuthService: CustomerAuthService,
  ) {}

  // -----------------------------
  // Public (API key only)
  // -----------------------------

  @Post('register')
  register(
    @Body() dto: RegisterCustomerDto,
    @CurrentCompanyId() companyId: string,
  ) {
    return this.customerAuthService.register(companyId, dto);
  }

  @Post('login')
  login(@Body() dto: LoginCustomerDto, @CurrentCompanyId() companyId: string) {
    return this.customerAuthService.login(companyId, dto);
  }

  // -----------------------------
  // Protected (API key + Customer JWT)
  // -----------------------------

  @UseGuards(CustomerJwtGuard)
  @Get()
  getProfile(@CurrentCustomer() customer: AuthCustomer) {
    return this.customersService.getProfile(customer);
  }

  @UseGuards(CustomerJwtGuard)
  @Patch()
  updateProfile(
    @CurrentCustomer() customer: AuthCustomer,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customersService.updateProfile(customer, dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Get('addresses')
  listAddresses(@CurrentCustomer() customer: AuthCustomer) {
    return this.customersService.listAddresses(customer);
  }

  @UseGuards(CustomerJwtGuard)
  @Post('addresses')
  createAddress(
    @CurrentCustomer() customer: AuthCustomer,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customersService.createAddress(customer, dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Patch('addresses/:id')
  updateAddress(
    @CurrentCustomer() customer: AuthCustomer,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customersService.updateAddress(customer, id, dto);
  }

  @UseGuards(CustomerJwtGuard)
  @Delete('addresses/:id')
  deleteAddress(
    @CurrentCustomer() customer: AuthCustomer,
    @Param('id') id: string,
  ) {
    return this.customersService.deleteAddress(customer, id);
  }
}
