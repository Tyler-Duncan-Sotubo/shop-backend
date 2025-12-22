import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingCarriersService } from './services/shipping-carriers.service';
import { ShippingRatesService } from './services/shipping-rates.service';
import { ShippingZonesService } from './services/shipping-zones.service';

@Module({
  controllers: [ShippingController],
  providers: [
    ShippingCarriersService,
    ShippingRatesService,
    ShippingZonesService,
  ],
  exports: [
    ShippingCarriersService,
    ShippingRatesService,
    ShippingZonesService,
  ],
})
export class ShippingModule {}
