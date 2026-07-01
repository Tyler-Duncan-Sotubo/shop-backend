import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ShippingOptionsService } from 'src/domains/fulfillment/shipping/services/shipping-options.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard)
export class ShippingController extends BaseController {
  constructor(private readonly options: ShippingOptionsService) {
    super();
  }

  @Get('options')
  @SetMetadata('permissions', ['shipping.zones.read'])
  listOptions(@CurrentUser() user: User, @Query('storeId') storeId: string) {
    return this.options.list(user.companyId, storeId);
  }

  @Post('options')
  @SetMetadata('permissions', ['shipping.zones.create'])
  createOption(
    @CurrentUser() user: User,
    @Body()
    body: {
      storeId: string;
      name: string;
      states?: string[];
      price?: number;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.options.create(user.companyId, body.storeId, body);
  }

  @Put('options/:id')
  @SetMetadata('permissions', ['shipping.zones.update'])
  updateOption(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      states?: string[];
      price?: number;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.options.update(id, user.companyId, body);
  }

  @Delete('options/:id')
  @SetMetadata('permissions', ['shipping.zones.delete'])
  removeOption(@CurrentUser() user: User, @Param('id') id: string) {
    return this.options.remove(id, user.companyId);
  }

  @Patch('options/:id/toggle')
  @SetMetadata('permissions', ['shipping.zones.update'])
  toggleOption(@CurrentUser() user: User, @Param('id') id: string) {
    return this.options.toggle(id, user.companyId);
  }
}
