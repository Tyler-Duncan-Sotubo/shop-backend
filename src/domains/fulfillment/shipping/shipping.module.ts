import { Module } from '@nestjs/common';
import { ShippingOptionsService } from './services/shipping-options.service';

@Module({
  providers: [ShippingOptionsService],
  exports: [ShippingOptionsService],
})
export class ShippingModule {}
