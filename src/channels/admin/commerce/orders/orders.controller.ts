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
import { User } from 'src/channels/admin/common/types/user.type';
import { ListOrdersDto } from './dto/list-orders.dto';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { UpdateManualOrderItemDto } from './dto/update-manual-order-item.dto';
import { AddManualOrderItemDto } from './dto/add-manual-order-item.dto';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrdersService } from 'src/domains/commerce/orders/orders.service';
import { ManualOrdersService } from 'src/domains/commerce/orders/manual-orders.service';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

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

  @Patch(':id/lay-buy')
  @SetMetadata('permissions', ['orders.update'])
  convertToLayBuy(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.orders.convertToLayBuy(user.companyId, id, user, ip);
  }

  @Patch(':orderId/customer-shipping')
  @SetMetadata('permissions', ['orders.update'])
  updateCustomerAndShipping(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
    @Body()
    dto: {
      customerId?: string;
      createCustomer?: {
        email: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
      };
      shippingAddressId?: string;
      billingAddressId?: string | null;
      shippingRateId?: string | null;
    },
    @Ip() ip: string,
  ) {
    return this.orders.updateCustomerAndShipping(
      user.companyId,
      orderId,
      dto,
      user,
      ip,
    );
  }

  // MANUAL ORDERS
  @Get('manual/:orderId/stock-check')
  @SetMetadata('permissions', ['orders.manual.create'])
  async checkStock(
    @Param('orderId') orderId: string,
    @CurrentUser() user: User,
  ) {
    return this.manualOrdersService.checkStockAvailability(
      user.companyId,
      orderId,
    );
  }

  @Post('manual')
  @SetMetadata('permissions', ['orders.manual.create'])
  createManualOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateManualOrderDto,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.createManualOrder(
      user.companyId,
      dto,
      user,
      ip,
    );
  }

  @Post('manual/items')
  @SetMetadata('permissions', ['orders.manual.edit'])
  async addItem(
    @CurrentUser() user: User,
    @Body() dto: AddManualOrderItemDto,
    @Ip() ip: string,
  ) {
    const item = await this.manualOrdersService.addItem(
      user.companyId,
      dto,
      false,
      user,
      ip,
    );

    // sync invoice after item added — only fires if order is pending_payment
    // (i.e. skipDraft was used). Safe to call unconditionally — idempotent.
    await this.manualOrdersService.syncInvoiceAfterItems(
      user.companyId,
      dto.orderId,
    );

    return item;
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

  @Patch('manual/:orderId/submit-for-payment')
  @SetMetadata('permissions', ['orders.manual.edit'])
  async submitForPayment(
    @CurrentUser() user: User,
    @Param('orderId') orderId: string,
    @Ip() ip: string,
  ) {
    return this.manualOrdersService.submitForPayment(
      user.companyId,
      orderId,
      user,
      ip,
    );
  }
}
