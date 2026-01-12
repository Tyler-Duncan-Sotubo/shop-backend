import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  SetMetadata,
  Ip,
  Query,
} from '@nestjs/common';
import { PickupService } from './pickup.service';
import { CreatePickupLocationDto } from './dto/create-pickup.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { BaseController } from 'src/common/interceptor/base.controller';
import { CurrentStoreId } from 'src/modules/storefront-config/decorators/current-store.decorator';
import { CurrentCompanyId } from 'src/modules/storefront-config/decorators/current-company-id.decorator';
import { StorefrontGuard } from 'src/modules/storefront-config/guard/storefront.guard';

@Controller('pickup')
export class PickupController extends BaseController {
  constructor(private readonly pickup: PickupService) {
    super();
  }

  @UseGuards(StorefrontGuard)
  @Get('storefront')
  listStoreFront(
    @CurrentCompanyId() companyId: string,
    @CurrentStoreId() storeId: string,
    @Query('state') state?: string,
  ) {
    return this.pickup.listStorefront(companyId, storeId, state);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.read'])
  list(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.pickup.listAdmin(user.companyId, storeId);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.create'])
  create(
    @CurrentUser() user: User,
    @Body() dto: CreatePickupLocationDto,
    @Ip() ip: string,
  ) {
    return this.pickup.create(user.companyId, dto, user, ip);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.update'])
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdatePickupDto,
    @Ip() ip: string,
  ) {
    return this.pickup.update(user.companyId, id, dto, user, ip);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['shipping.zones.update'])
  delete(@CurrentUser() user: User, @Param('id') id: string, @Ip() ip: string) {
    return this.pickup.deactivate(user.companyId, id, user, ip);
  }
}
