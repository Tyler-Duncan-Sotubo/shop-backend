import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CustomerAuthService } from './customer-auth.service';
import { CustomerJwtGuard } from './guards/customer-jwt.guard';
import { CustomerPrimaryGuard } from './guards/customer-primary.guard';
import { JwtService } from '@nestjs/jwt';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminCustomersService } from './admin-customers.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [CustomersController, AdminCustomersController],
  providers: [
    CustomersService,
    CustomerAuthService,
    CustomerJwtGuard,
    CustomerPrimaryGuard,
    JwtService,
    AdminCustomersService,
    StoresService,
    AwsService,
  ],
})
export class CustomersModule {}
