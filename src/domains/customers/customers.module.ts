import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomerAuthService } from './customer-auth.service';
import { JwtService } from '@nestjs/jwt';
import { AdminCustomersService } from './admin-customers.service';
import { StoresService } from '../commerce/stores/stores.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [
    CustomersService,
    CustomerAuthService,
    JwtService,
    AdminCustomersService,
    StoresService,
    AwsService,
  ],
  exports: [CustomersService, CustomerAuthService, AdminCustomersService],
})
export class CustomersModule {}
