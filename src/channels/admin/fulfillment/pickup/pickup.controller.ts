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
import { CreatePickupLocationDto } from './dto/create-pickup.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PickupService } from 'src/domains/fulfillment/pickup/pickup.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('pickup')
@UseGuards(JwtAuthGuard)
export class PickupController extends BaseController {
  constructor(private readonly pickup: PickupService) {
    super();
  }

  @Get('admin')
  @SetMetadata('permissions', ['shipping.zones.read'])
  list(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.pickup.listAdmin(user.companyId, storeId);
  }

  @Post('admin')
  @SetMetadata('permissions', ['shipping.zones.create'])
  create(
    @CurrentUser() user: User,
    @Body() dto: CreatePickupLocationDto,
    @Ip() ip: string,
  ) {
    return this.pickup.create(user.companyId, dto, user, ip);
  }

  @Patch('admin/:id')
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
  @SetMetadata('permissions', ['shipping.zones.update'])
  delete(@CurrentUser() user: User, @Param('id') id: string, @Ip() ip: string) {
    return this.pickup.deactivate(user.companyId, id, user, ip);
  }
}
