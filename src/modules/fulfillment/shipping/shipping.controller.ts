import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

import {
  CreateCarrierDto,
  CreateRateDto,
  CreateZoneDto,
  QuoteShippingDto,
  UpdateRateDto,
  UpsertRateTierDto,
  UpsertZoneLocationDto,
} from './dto';

import { ShippingZonesService } from './services/shipping-zones.service';
import { ShippingCarriersService } from './services/shipping-carriers.service';
import { ShippingRatesService } from './services/shipping-rates.service';

@Controller('shipping')
export class ShippingController extends BaseController {
  constructor(
    private readonly zones: ShippingZonesService,
    private readonly carriers: ShippingCarriersService,
    private readonly rates: ShippingRatesService,
  ) {
    super();
  }

  // ----------------- Zones -----------------
  @Get('zones')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.read'])
  listZones(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.zones.listZones(user.companyId, storeId);
  }

  @Post('zones')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.create'])
  createZone(
    @CurrentUser() user: User,
    @Body() dto: CreateZoneDto,
    @Ip() ip: string,
  ) {
    return this.zones.createZone(user.companyId, dto, user, ip);
  }

  @Patch('zones/:zoneId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.update'])
  updateZone(
    @CurrentUser() user: User,
    @Param('zoneId') zoneId: string,
    @Body() dto: Partial<CreateZoneDto>,
    @Ip() ip: string,
  ) {
    return this.zones.updateZone(user.companyId, zoneId, dto, user, ip);
  }

  @Delete('zones/:zoneId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.delete'])
  deleteZone(
    @CurrentUser() user: User,
    @Param('zoneId') zoneId: string,
    @Ip() ip: string,
  ) {
    return this.zones.deleteZone(user.companyId, zoneId, user, ip);
  }

  // Zone locations

  @Get('zones/:zoneId/locations')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.read'])
  listZoneLocations(
    @CurrentUser() user: User,
    @Param('zoneId') zoneId: string,
  ) {
    return this.zones.listZoneLocations(user.companyId, zoneId);
  }

  @Post('zones/locations')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.update'])
  upsertZoneLocation(
    @CurrentUser() user: User,
    @Body() dto: UpsertZoneLocationDto,
    @Ip() ip: string,
  ) {
    return this.zones.upsertZoneLocation(user.companyId, dto, user, ip);
  }

  @Patch('zones/locations/:locationId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.update'])
  updateZoneLocation(
    @CurrentUser() user: User,
    @Param('locationId') locationId: string,
    @Body() dto: UpsertZoneLocationDto,
    @Ip() ip: string,
  ) {
    return this.zones.updateZoneLocation(
      user.companyId,
      locationId,
      dto,
      user,
      ip,
    );
  }

  @Delete('zones/locations/:locationId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.update'])
  removeZoneLocation(
    @CurrentUser() user: User,
    @Param('locationId') locationId: string,
    @Ip() ip: string,
  ) {
    return this.zones.removeZoneLocation(user.companyId, locationId, user, ip);
  }

  // ----------------- Carriers -----------------
  @Get('carriers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.carriers.read'])
  listCarriers(@CurrentUser() user: User) {
    return this.carriers.listCarriers(user.companyId);
  }

  @Post('carriers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.carriers.create'])
  createCarrier(
    @CurrentUser() user: User,
    @Body() dto: CreateCarrierDto,
    @Ip() ip: string,
  ) {
    return this.carriers.createCarrier(user.companyId, dto, user, ip);
  }

  @Patch('carriers/:carrierId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.carriers.update'])
  updateCarrier(
    @CurrentUser() user: User,
    @Param('carrierId') carrierId: string,
    @Body() dto: Partial<CreateCarrierDto>,
    @Ip() ip: string,
  ) {
    return this.carriers.updateCarrier(
      user.companyId,
      carrierId,
      dto,
      user,
      ip,
    );
  }

  @Delete('carriers/:carrierId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.carriers.delete'])
  deleteCarrier(
    @CurrentUser() user: User,
    @Param('carrierId') carrierId: string,
    @Ip() ip: string,
  ) {
    return this.carriers.deleteCarrier(user.companyId, carrierId, user, ip);
  }

  // ----------------- Rates -----------------
  @Get('rates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.read'])
  listRates(
    @CurrentUser() user: User,
    @Query('zoneId') zoneId?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.rates.listRates(user.companyId, { zoneId, storeId });
  }

  @Post('rates')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.create'])
  createRate(
    @CurrentUser() user: User,
    @Body() dto: CreateRateDto,
    @Ip() ip: string,
  ) {
    return this.rates.createRate(user.companyId, dto, user, ip);
  }

  @Patch('rates/:rateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.update'])
  updateRate(
    @CurrentUser() user: User,
    @Param('rateId') rateId: string,
    @Body() dto: UpdateRateDto,
    @Ip() ip: string,
  ) {
    return this.rates.updateRate(user.companyId, rateId, dto, user, ip);
  }

  @Delete('rates/:rateId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.delete'])
  deleteRate(
    @CurrentUser() user: User,
    @Param('rateId') rateId: string,
    @Ip() ip: string,
  ) {
    return this.rates.deleteRate(user.companyId, rateId, user, ip);
  }

  // ----------------- Rate tiers -----------------
  @Get('rates/:rateId/tiers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.read'])
  listTiers(@CurrentUser() user: User, @Param('rateId') rateId: string) {
    return this.rates.listRateTiers(user.companyId, rateId);
  }

  @Post('rates/tiers')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.update'])
  createTier(
    @CurrentUser() user: User,
    @Body() dto: UpsertRateTierDto,
    @Ip() ip: string,
  ) {
    return this.rates.upsertRateTier(user.companyId, dto, user, ip);
  }

  // ----------------- Rate tiers -----------------

  @Patch('rates/tiers/:tierId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.update'])
  updateTier(
    @CurrentUser() user: User,
    @Param('tierId') tierId: string,
    @Body() dto: Partial<UpsertRateTierDto>,
    @Ip() ip: string,
  ) {
    return this.rates.updateRateTier(user.companyId, tierId, dto, user, ip);
  }

  @Delete('rates/tiers/:tierId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.rates.update'])
  deleteTier(
    @CurrentUser() user: User,
    @Param('tierId') tierId: string,
    @Ip() ip: string,
  ) {
    return this.rates.deleteRateTier(user.companyId, tierId, user, ip);
  }

  // ----------------- Quote (for checkout UI / cart totals) -----------------
  @Post('quote')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.quote'])
  quote(@CurrentUser() user: User, @Body() dto: QuoteShippingDto) {
    return this.rates.quote(user.companyId, dto);
  }
}
