import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CartTokenGuard } from './cart-token.guard';
import { CustomerJwtGuard } from './customer-jwt.guard';
import { StorefrontGuard } from './storefront.guard';
import { CustomerPrimaryGuard } from './customer-primary.guard';

@Global()
@Module({
  imports: [JwtModule.register({})], // or registerAsync
  providers: [
    CartTokenGuard,
    CustomerJwtGuard,
    StorefrontGuard,
    CustomerPrimaryGuard,
  ],
  exports: [
    CartTokenGuard,
    CustomerJwtGuard,
    StorefrontGuard,
    JwtModule,
    CustomerPrimaryGuard,
  ],
})
export class StorefrontGuardsModule {}
