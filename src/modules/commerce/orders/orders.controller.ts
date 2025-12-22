import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  SetMetadata,
  Body,
  Ip,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { User } from 'src/common/types/user.type';
import { OrdersService } from './orders.service';
import { ListOrdersDto } from './dto/list-orders.dto';
import { CurrentUser } from '../../auth/decorator/current-user.decorator';
import { BaseController } from 'src/common/interceptor/base.controller';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { ManualOrdersService } from './manual-orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController extends BaseController {
  constructor(
    private readonly orders: OrdersService,
    private readonly manualOrdersService: ManualOrdersService,
  ) {
    super();
  }

  @Get()
  @SetMetadata('permissions', ['orders.read'])
  list(@CurrentUser() user: User, @Query() q: ListOrdersDto) {
    return this.orders.listOrders(user.companyId, q);
  }

  @Get(':id')
  @SetMetadata('permissions', ['orders.read'])
  get(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.getOrder(user.companyId, id);
  }

  // LATER:
  @Post(':id/pay')
  @SetMetadata('permissions', ['orders.update'])
  pay(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.markPaid(user.companyId, id, user, undefined);
  }

  @Post(':id/cancel')
  @SetMetadata('permissions', ['orders.update'])
  cancel(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.cancel(user.companyId, id, user, undefined);
  }

  @Post(':id/fulfill')
  @SetMetadata('permissions', ['orders.update'])
  fulfill(@CurrentUser() user: User, @Param('id') id: string) {
    return this.orders.fulfill(user.companyId, id, user, undefined);
  }

  // MANUAL ORDERS
  @Post('manual')
  @SetMetadata('permissions', ['orders.manual.create'])
  createManualOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateManualOrderDto,
    @Ip() ip: string,
  ) {
    console.log('Creating manual order with DTO:', dto);
    return this.manualOrdersService.createManualOrder(
      user.companyId,
      dto,
      user,
      ip,
    );
  }

  @Post('manual/items')
  @SetMetadata('permissions', ['orders.manual.edit'])
  addItem(
    @CurrentUser() user: User,
    @Body() dto: AddManualOrderItemDto,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.addItem(user.companyId, dto, user, ip);
  }

  @Patch('manual/items/:itemId')
  @SetMetadata('permissions', ['orders.manual.edit'])
  updateItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateManualOrderItemDto,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.updateItem(
      user.companyId,
      { ...dto, itemId },
      user,
      ip,
    );
  }

  @Delete('manual/:orderId')
  @SetMetadata('permissions', ['orders.manual.delete'])
  async deleteManual(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.deleteManualOrder(
      user.companyId,
      orderId,
      user,
      ip,
    );
  }
}
