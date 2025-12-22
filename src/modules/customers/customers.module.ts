import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CustomerPrimaryGuard } from './guards/customer-primary.guard';
import { JwtService } from '@nestjs/jwt';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminCustomersService } from './admin-customers.service';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';

@Module({
  controllers: [CustomersController, AdminCustomersController],
  providers: [
    CustomersService,
    CustomerAuthService,
    CustomerJwtGuard,
    CustomerPrimaryGuard,
    JwtService,
    AdminCustomersService,
    ApiKeysService,
  ],
})
export class CustomersModule {}
